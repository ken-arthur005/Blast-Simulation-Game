import React, {
  useEffect,
  useState,
  useCallback,
  useContext,
  useRef,
} from "react";
import GridDataProcessor from "../utils/gridDataProcessor";
import printGridDebugInfo from "../utils/printGridDebugInfo";
import GridCanvas from "./GridCanvas";
import GridLegend from "./GridLegend";
import GridInfo from "./GridInfo";
import { GameContext } from "./GameContext";
import {
  calculateAllAffectedCells,
  applyBlastToGrid,
} from "../utils/blastCalculator";
import BlastResults from "./BlastResults";
import LeaderboardModal from "./Leaderboard.jsx"; // <--- NEW IMPORT
import Toast from "./Toast";
import {
  saveManualSimulation,
  saveAutoSimulation,
  saveHighscore, 
} from "../utils/simulationManager";
import { loadSimulation } from "../utils/loadSimulation";

const OreGridVisualization = ({ csvData, onGridProcessed }) => {
  const { addRecoveryRecord, updateScore } = useContext(GameContext);
  const [gridData, setGridData] = useState(null);
  const [originalGridData, setOriginalGridData] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 400 });
  const [blockSize, setBlockSize] = useState(20);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileResetKey, setFileResetKey] = useState(0);
  const {
    gameState,
    clearBlasts,
    setGameState,
    pendingDirection,
    setPendingDirection,
  } = useContext(GameContext);
  const [isBlasting, setIsBlasting] = useState(false);
  const [blastTrigger, setBlastTrigger] = useState(null);
  const [selectedBlast, setSelectedBlast] = useState(null);
  const csvDataRef = useRef(null);
  const [loadFileInputKey, setLoadFileInputKey] = useState(0);
  
  const nextPlacementDirRef = useRef(
    pendingDirection
      ? { dir: pendingDirection, explicit: true }
      : { dir: null, explicit: false }
  );
  
  const lastPlacedRef = useRef(null);
  const [fallenDebris, setFallenDebris] = useState([]);
  const [showBlastResults, setShowBlastResults] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false); // <--- NEW STATE
  const [toast, setToast] = useState(null);
  const [isPreparingReplay, setIsPreparingReplay] = useState(false);

  // ... (keep showToast, handleCloseBlastResults, handleOpenBlastResults) ...
  const showToast = useCallback((message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const handleCloseBlastResults = () => setShowBlastResults(false);
  const handleOpenBlastResults = () => setShowBlastResults(true);

  // ... (keep handleReplayBlast) ...
  const handleReplayBlast = useCallback(() => {
    if (typeof window === "undefined" || !window.lastBlastPhysicsState) {
      showToast("No replay data available.", "error");
      return;
    }

    console.log("🎬 Starting blast replay...");
    setShowBlastResults(false);
    setIsPreparingReplay(true);
    setFallenDebris([]);

    setTimeout(() => {
      setIsPreparingReplay(false);
      setBlastTrigger({
        affectedCells: window.lastBlastPhysicsState.affectedCells,
        timestamp: Date.now(),
        isReplay: true,
        replayData: window.lastBlastPhysicsState,
      });
      showToast("Replaying blast animation...", "success");
    }, 800);
  }, [showToast]);

  // ... (keep handleTriggerBlast, setBlastDirection, onSelectDirection) ...
  const handleTriggerBlast = () => {
     if (isBlasting) return;
     if (!gameState.blasts || gameState.blasts.length === 0) return;
     if (!gridData || !gridData.grid) return;

     setIsBlasting(true);
     setGameState((prev) => ({ ...prev, canPlaceExplosives: false }));

     const affectedCells = calculateAllAffectedCells(
      gridData.grid,
      gameState.blasts
    );
    setBlastTrigger({ affectedCells, timestamp: Date.now() });
  };
  
  const setBlastDirection = useCallback((x, y, dirKey) => {
      setGameState((prev) => {
        const updatedBlasts = prev.blasts.map((b) => {
          if (b.x === x && b.y === y) return { ...b, dirKey };
          return b;
        });
        return { ...prev, blasts: updatedBlasts };
      });
    }, [setGameState]);

   const onSelectDirection = useCallback(
    (dir, opts = {}) => {
      const applyToNext = opts.applyToNext === true;
      if (selectedBlast) {
        setBlastDirection(selectedBlast.x, selectedBlast.y, dir);
        if (applyToNext) {
          if (setPendingDirection) setPendingDirection(dir);
          nextPlacementDirRef.current = { dir, explicit: true };
        }
      } else {
        const last = lastPlacedRef.current;
        const now = Date.now();
        if (last && now - last.t < 2000) {
          setBlastDirection(last.x, last.y, dir);
          if (applyToNext) {
            if (setPendingDirection) setPendingDirection(dir);
            nextPlacementDirRef.current = { dir, explicit: true };
          }
          lastPlacedRef.current = null;
          return;
        }
        if (setPendingDirection) setPendingDirection(dir);
        nextPlacementDirRef.current = { dir, explicit: true };
      }
    },
    [selectedBlast, setBlastDirection, setPendingDirection]
  );


  // MODIFIED handleBlastComplete
  const handleBlastComplete = useCallback(
    (isReplayCompletion = false) => {
      if (isReplayCompletion) {
        setBlastTrigger(null);
        setIsBlasting(false);
        setTimeout(() => {
          handleOpenBlastResults();
        }, 0);
        return;
      }

      setBlastTrigger(null);
      setIsBlasting(false);

      if (!gridData || !gridData.grid) return;

      const affectedCells = calculateAllAffectedCells(
        gridData.grid,
        gameState.blasts
      );

      const updatedGrid = applyBlastToGrid(gridData.grid, affectedCells);
      const totalBlocks = gridData.grid.flat().length;
      const remainingBlocks = totalBlocks - affectedCells.length;

      setGameState((prev) => ({
        ...prev,
        materialsRemainedAfterDestroy: remainingBlocks,
        numberOfMaterialsDestroyed: affectedCells.length,
        canPlaceExplosives: false,
      }));

      setGridData((prevState) => ({
        ...prevState,
        grid: updatedGrid,
        remainingBlocks,
      }));

      clearBlasts();
      setSelectedBlast(null);
      if (setPendingDirection) setPendingDirection(null);
      if (nextPlacementDirRef) nextPlacementDirRef.current = null;

      handleOpenBlastResults();

      // --- TRIGGER AUTO-SAVE & LEADERBOARD SAVE ---
      const roundNumber = (gameState.blastHistory?.length || 0) + 1;
      const physicsReplayData = typeof window !== "undefined" ? window.lastBlastPhysicsState : null;

      const autoSaveState = {
        savedAt: new Date().toISOString(),
        initialGridState: {
          grid: originalGridData.grid,
          dimensions: originalGridData.dimensions,
          metadata: originalGridData.metadata,
        },
        simulationSnapshot: {
          grid: updatedGrid,
          fallenDebris: fallenDebris,
        },
        gameState: {
          ...gameState,
          blasts: [],
          grid: updatedGrid,
        },
        physicsReplayData: physicsReplayData ? { ...physicsReplayData } : null,
      };
      
      saveAutoSimulation(autoSaveState, roundNumber);

      // SAVE TO LEADERBOARD
      if (physicsReplayData && physicsReplayData.expectedScore) {
          saveHighscore({
              playerName: gameState.playerName || "Miner",
              score: physicsReplayData.expectedScore,
              efficiency: ((physicsReplayData.expectedRecoveryRate / 100) * 100).toFixed(1), // Basic efficiency calc
              recoveryRate: physicsReplayData.expectedRecoveryRate,
              timestamp: new Date().toISOString()
          });
      }
    },
    [
      gridData,
      gameState,
      setGameState,
      clearBlasts,
      setPendingDirection,
      originalGridData,
      fallenDebris,
    ]
  );
  
  // ... (keep calculateOptimalSizing, handleCellClick, useEffect for CSV) ...
  const calculateOptimalSizing = useCallback((processedGrid) => {
    // ... (Keep existing implementation) ...
    const { dimensions } = processedGrid;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    const preferredWidth = isMobile ? Math.min(window.innerWidth - 40, 360) : 576;
    const preferredHeight = isMobile ? Math.min(window.innerHeight * 0.5, 400) : 456;
    const blockSizeByWidth = Math.floor(preferredWidth / dimensions.width);
    const blockSizeByHeight = Math.floor(preferredHeight / dimensions.height);
    let blockSize = Math.min(blockSizeByWidth, blockSizeByHeight);
    const minBlockSize = isMobile ? 35 : 6;
    const maxBlockSize = isMobile ? 60 : 80;

    if (blockSize < minBlockSize || blockSize > maxBlockSize) {
      blockSize = Math.max(minBlockSize, Math.min(maxBlockSize, blockSize));
      const canvasWidth = Math.min(dimensions.width * blockSize, 800);
      const canvasHeight = Math.min(dimensions.height * blockSize, 600);
      setCanvasSize({ width: canvasWidth, height: canvasHeight });
    } else {
      const exactWidth = dimensions.width * blockSize;
      const exactHeight = dimensions.height * blockSize;
      setCanvasSize({ width: exactWidth, height: exactHeight });
    }
    setBlockSize(blockSize);
  }, []);

  const handleCellClick = useCallback((x, y) => {
    // ... (Keep existing implementation) ...
    if (!gameState.canPlaceExplosives) {
        alert("Please import a new CSV file or refresh the page to continue placing explosives.");
        return;
      }

      const existing = gameState.blasts.find(
        (blast) => blast.x === x && blast.y === y
      );
      if (existing) {
        if (selectedBlast && selectedBlast.x === x && selectedBlast.y === y) {
          setSelectedBlast(null);
        } else {
          setSelectedBlast({ x, y });
        }
        return;
      }

      const newBlast = {
        x,
        y,
        radius: gameState.blastRadius,
        dirKey: nextPlacementDirRef.current && nextPlacementDirRef.current.explicit
            ? nextPlacementDirRef.current.dir
            : null,
      };

      if (gameState.blasts.length >= 5) {
        showToast(`Maximum number of explosives that can be placed is 5`, "error");
        return;
      }

      setGameState((prev) => ({
        ...prev,
        blasts: [...prev.blasts, newBlast],
      }));
      setSelectedBlast({ x, y });
      lastPlacedRef.current = { x, y, t: Date.now() };

      if (!nextPlacementDirRef.current || !nextPlacementDirRef.current.explicit) {
        nextPlacementDirRef.current = { dir: null, explicit: false };
        if (setPendingDirection) setPendingDirection(null);
      }
  }, [gameState.blasts, gameState.canPlaceExplosives, setGameState, gameState.blastRadius, pendingDirection, selectedBlast, setPendingDirection, showToast]);

   useEffect(() => {
    if (csvData && csvData !== csvDataRef.current) {
      csvDataRef.current = csvData;
      setBlastTrigger(null);
      setIsBlasting(false);
      setGridData(null);
      setIsProcessing(true);

      try {
        const processedGrid = GridDataProcessor.processCSVToGrid(csvData);

        if (processedGrid && GridDataProcessor.validateGridData(processedGrid)) {
          setGridData(processedGrid);
          calculateOptimalSizing(processedGrid);
          
          setOriginalGridData(
            structuredClone
              ? structuredClone(processedGrid)
              : JSON.parse(JSON.stringify(processedGrid))
          );

          setGameState((prev) => ({
            ...prev,
            grid: processedGrid.grid,
            blasts: [],
            canPlaceExplosives: true,
          }));

          setFileResetKey((prev) => prev + 1);
          if (onGridProcessed) onGridProcessed(processedGrid);
        } else {
          setGridData(null);
        }
      } catch (error) {
        setGridData(null);
      } finally {
        setIsProcessing(false);
      }
    }
  }, [csvData, onGridProcessed, calculateOptimalSizing, setGameState]);


  const handleCanvasReset = () => {
    if (!originalGridData) return;
    const restoredGrid = structuredClone
      ? structuredClone(originalGridData)
      : JSON.parse(JSON.stringify(originalGridData));

    setGridData(restoredGrid);
    setGameState((prev) => ({
      ...prev,
      grid: restoredGrid.grid,
      blasts: [],
      canPlaceExplosives: true,
      materialsRemainedAfterDestroy: 0,
      numberOfMaterialsDestroyed: 0,
    }));
    setSelectedBlast(null);
    if (nextPlacementDirRef) nextPlacementDirRef.current = null;
    setFallenDebris([]);
    setBlastTrigger(null);
    setShowBlastResults(false);
    setFileResetKey((prevKey) => prevKey + 1);
  };

  // ----------------------------------------------------------------------
  // MODIFIED LOAD SIMULATION HANDLER
  // ----------------------------------------------------------------------
  const handleLoadSimulation = useCallback(
    async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const startTime = performance.now();
      setIsProcessing(true);
      setToast(null);

      try {
        const loadedState = await loadSimulation(file);

        setGridData({
          grid: loadedState.currentGrid,
          dimensions: loadedState.gridDimensions,
          metadata: loadedState.gridMetadata,
        });
        setOriginalGridData({
          grid: loadedState.originalGrid,
          dimensions: loadedState.gridDimensions,
          metadata: loadedState.gridMetadata,
        });

        setGameState((prev) => ({
          ...prev,
          playerName: loadedState.gameState.playerName,
          score: loadedState.gameState.score,
          blasts: loadedState.gameState.blasts,
          recoveryHistory: loadedState.gameState.recoveryHistory,
          blastHistory: loadedState.gameState.blastHistory || prev.blastHistory,
          canPlaceExplosives: loadedState.gameState.canPlaceExplosives,
          grid: loadedState.currentGrid,
          materialsRemainedAfterDestroy: loadedState.gameState.materialsRemainedAfterDestroy || 0,
          numberOfMaterialsDestroyed: loadedState.gameState.numberOfMaterialsDestroyed || 0,
        }));
        
        // --- CRITICAL REPLAY FIX ---
        // Restore the physics state to the window object so the "Replay" button works
        if (loadedState.physicsReplayData && typeof window !== 'undefined') {
            console.log("Restoring physics replay data from file...");
            window.lastBlastPhysicsState = loadedState.physicsReplayData;
        } else {
            console.warn("No physics replay data found in save file.");
            window.lastBlastPhysicsState = null;
        }
        // ---------------------------

        setSelectedBlast(loadedState.selectedBlast || null);
        setFileResetKey((prev) => prev + 1); 

        // If the save was post-blast, show the debris
        if (loadedState.simulationSnapshot && loadedState.simulationSnapshot.fallenDebris) {
             setFallenDebris(loadedState.simulationSnapshot.fallenDebris);
        }

        const duration = (performance.now() - startTime) / 1000;
        showToast(`Simulation loaded successfully in ${duration.toFixed(2)}s!`, "success");
      } catch (error) {
        showToast(error.message || "An unknown error occurred during loading.", "error");
      } finally {
        setIsProcessing(false);
        setLoadFileInputKey((prev) => prev + 1);
      }
    },
    [setGameState, showToast, setGridData, setOriginalGridData, setFileResetKey]
  );

  // ... (Keep existing history logic and handleSaveSimulation/Export) ...
  const recoveryHistory = gameState.recoveryHistory;
  const blastHistory = gameState.blastHistory;
  const lastRecoveryDetail = recoveryHistory?.length > 0 ? recoveryHistory[recoveryHistory.length - 1] : { recoveredCount: 0, efficiency: 0 };
  const lastBlastRecord = blastHistory?.length > 0 ? blastHistory[blastHistory.length - 1] : { recovery: 0, dilution: 0, score: 0 };
  
  const handleSaveSimulation = () => {
    if (isBlasting) {
      showToast("Cannot save while a blast is in progress.", "error");
      return;
    }
    if (!gridData || !originalGridData) {
      showToast("Cannot save, grid data is not available.", "error");
      return;
    }

    const physicsReplayData = typeof window !== "undefined" ? window.lastBlastPhysicsState : null;

    const simulationState = {
      savedAt: new Date().toISOString(),
      initialGridState: {
        grid: originalGridData.grid,
        dimensions: originalGridData.dimensions,
        metadata: originalGridData.metadata,
      },
      simulationSnapshot: {
        grid: gridData.grid,
        fallenDebris: fallenDebris,
      },
      gameState: {
        playerName: gameState.playerName,
        blasts: gameState.blasts, 
        blastHistory: gameState.blastHistory,
        canPlaceExplosives: gameState.canPlaceExplosives,
        materialsRemainedAfterDestroy: gameState.materialsRemainedAfterDestroy,
        numberOfMaterialsDestroyed: gameState.numberOfMaterialsDestroyed,
      },
      physicsReplayData: physicsReplayData ? { ...physicsReplayData } : null,
    };

    const success = saveManualSimulation(simulationState);
    if (success) {
      showToast("Simulation saved successfully!", "success");
    } else {
      showToast("Failed to save simulation. Storage might be full.", "error");
    }
  };

  const handleExportSimulation = () => {
     // ... (Keep existing implementation) ...
      if (!gridData) {
      showToast("Cannot export, grid data is not available.", "error");
      return;
    }
    const timestamp = new Date().toLocaleTimeString('en-GB').replace(/:/g, '-');
    const datestamp = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    const sessionData = {
      gridDimensions: gridData.dimensions,
      blastHistory: gameState.blastHistory,
      recoveryHistory: gameState.recoveryHistory,
      finalScore: gameState.score,
      remainingMaterials: gameState.materialsRemainedAfterDestroy,
      numberOfMaterialsDestroyed: gameState.numberOfMaterialsDestroyed,
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessionData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "simulation_" + datestamp + "_" + timestamp + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    showToast("Simulation exported successfully!", "success");
  };

  if (!csvData) return <div className="text-center py-8 text-gray-500"><p>Upload a CSV file to visualize the ore grid</p></div>;
  if (isProcessing || !gridData) return <div className="text-center py-8 text-gray-500"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div><p>Processing grid data...</p></div>;

  return (
    <div className="w-full min-h-screen relative">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Leaderboard Modal */}
      <LeaderboardModal 
        show={showLeaderboard} 
        onClose={() => setShowLeaderboard(false)} 
      />

      <div className="md:absolute md:left-1/2 md:transform md:-translate-x-1/2 md:max-w-[70%]  px-2 md:px-0">
        <h2 className="text-base md:text-xl font-bold mb-2 md:mb-4  md:text-left text-amber-500">
          2D Ore Grid Visualization
        </h2>

        <GridInfo gridData={gridData} blockSize={blockSize} canvasSize={canvasSize} />

        <div className="flex justify-center">
          <GridCanvas
            gridData={gridData}
            canvasSize={canvasSize}
            blockSize={blockSize}
            blasts={gameState.blasts}
            selectedBlast={selectedBlast}
            onBlockClick={handleCellClick}
            blastTrigger={blastTrigger}
            onBlastComplete={handleBlastComplete}
            onDebrisSettled={setFallenDebris}
            fallenDebris={fallenDebris}
            fileResetKey={fileResetKey}
            addRecoveryRecordToGameContext={addRecoveryRecord}
            updateScore={updateScore}
            isPreparingReplay={isPreparingReplay}
          />
        </div>

        <div className="md:hidden mt-4">
          <GridLegend
            oreTypes={gridData.metadata.oreTypes}
            onTriggerBlast={handleTriggerBlast}
            resetCanvas={handleCanvasReset}
            isBlasting={isBlasting}
            selectedBlast={selectedBlast}
            onSelectDirection={onSelectDirection}
            onSaveSimulation={handleSaveSimulation}
            onLoadSimulation={handleLoadSimulation}
            loadFileInputKey={loadFileInputKey}
            onOpenLeaderboard={() => setShowLeaderboard(true)} // <--- CONNECT
          />
        </div>
      </div>

      <div className="hidden md:block absolute top-8 right-4 w-66 z-50">
        <GridLegend
          oreTypes={gridData.metadata.oreTypes}
          onTriggerBlast={handleTriggerBlast}
          resetCanvas={handleCanvasReset}
          onSaveSimulation={handleSaveSimulation}
          isBlasting={isBlasting}
          selectedBlast={selectedBlast}
          onSelectDirection={onSelectDirection}
          onLoadSimulation={handleLoadSimulation}
          loadFileInputKey={loadFileInputKey}
          onOpenLeaderboard={() => setShowLeaderboard(true)} // <--- CONNECT
        />
      </div>

      <BlastResults
        show={showBlastResults}
        onClose={handleCloseBlastResults}
        onSave={handleSaveSimulation}
        onReplay={handleReplayBlast}
        blastRadiusUsed={gameState.blastRadius}
        materialsDestroyed={gameState.numberOfMaterialsDestroyed}
        score={lastBlastRecord.score}
        materialsRemained={gameState.materialsRemainedAfterDestroy}
        resetCanvas={handleCanvasReset}
        recoveredCount={lastRecoveryDetail.recoveredCount}
        efficiency={lastRecoveryDetail.efficiency}
        recoveryRate={lastBlastRecord.recovery}
        dilutionRate={lastBlastRecord.dilution}
        onLoad={handleLoadSimulation}
        loadFileInputKey={loadFileInputKey}
        onExportSimulation={handleExportSimulation}
      />
    </div>
  );
};

export default OreGridVisualization;