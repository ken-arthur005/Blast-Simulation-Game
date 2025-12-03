import React, {
  useEffect,
  useState,
  useCallback,
  useContext,
  useRef,
  useMemo,
} from "react";
import GridDataProcessor from "../utils/gridDataProcessor";
import useSoundManager from "../utils/useSoundManager";
import { Volume2, VolumeX, Undo2, FileBarChart2 } from "lucide-react";
import GridCanvas from "./GridCanvas";
import GridLegend from "./GridLegend";
import GridInfo from "./GridInfo";
import { GameContext } from "./GameContext";
import {
  calculateAllAffectedCells,
  applyBlastToGrid,
} from "../utils/blastCalculator";
import BlastResults from "./BlastResults";
import LeaderboardModal from "./Leaderboard.jsx";
import Toast from "./Toast";
import {
  saveManualSimulation,
  saveAutoSimulation,
  saveHighscore,
} from "../utils/simulationManager";
import { loadSimulation } from "../utils/loadSimulation";
import LoadGameModal from "./LoadGameModal";

const OreGridVisualization = ({ csvData, onGridProcessed }) => {
  // 1. Hooks & State
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
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [toast, setToast] = useState(null);
  const [isPreparingReplay, setIsPreparingReplay] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  
  // Audio & Visual State
  const { isMuted, toggleMute, playSound } = useSoundManager();
  const [showFlash, setShowFlash] = useState(false);

  // 2. Helper Functions (Defined FIRST so they can be used below)
  
  const showToast = useCallback((message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  // 3. Core Action Handlers (Must be defined BEFORE the useEffect)

  // --- Reset Handler ---
  // Wrapped in useCallback to prevent re-renders in the keyboard effect
  const handleCanvasReset = useCallback(() => {
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
    if (nextPlacementDirRef.current) nextPlacementDirRef.current = null;
    setFallenDebris([]);
    setBlastTrigger(null);
    setShowBlastResults(false);
    setFileResetKey((prevKey) => prevKey + 1);
  }, [originalGridData, setGameState]);

  // --- Blast Trigger Handler ---
  const handleTriggerBlast = useCallback(() => {
    if (isBlasting) return;
    if (!gameState.blasts || gameState.blasts.length === 0) return;
    if (!gridData || !gridData.grid) return;

    // 1. Audio & Visuals
    playSound("boom");
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 150);

    // 2. Game Logic
    setIsBlasting(true);
    setGameState((prev) => ({ ...prev, canPlaceExplosives: false }));

    const affectedCells = calculateAllAffectedCells(
      gridData.grid,
      gameState.blasts
    );
    setBlastTrigger({ affectedCells, timestamp: Date.now() });
  }, [isBlasting, gameState.blasts, gridData, playSound, setGameState]);

  // --- Undo Handler ---
  const handleUndoBlast = useCallback(() => {
    if (isBlasting) return;

    setGameState((prev) => {
      if (prev.blasts.length === 0) return prev;
      const newBlasts = prev.blasts.slice(0, -1); // Remove last item
      return { ...prev, blasts: newBlasts };
    });

    setSelectedBlast(null);
    playSound("click");
    showToast("Last placement undone", "info");
  }, [isBlasting, setGameState, playSound, showToast]);

  // 4. Keyboard Shortcuts Effect (Now placed AFTER the handlers are defined)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === 'INPUT') return;

      switch(e.code) {
        case 'Space':
          e.preventDefault(); // Prevent scrolling
          handleTriggerBlast();
          break;
        case 'KeyR':
          handleCanvasReset();
          break;
        case 'Escape':
          setShowBlastResults(false);
          setShowLeaderboard(false);
          setSelectedBlast(null);
          break;
        case 'KeyZ':
          if (e.ctrlKey || e.metaKey) { // Ctrl+Z or Cmd+Z
            handleUndoBlast();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTriggerBlast, handleCanvasReset, handleUndoBlast]);

  // 5. Other Handlers & Effects

  const handleCloseBlastResults = () => setShowBlastResults(false);
  const handleOpenBlastResults = () => setShowBlastResults(true);

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

  const setBlastDirection = useCallback(
    (x, y, dirKey) => {
      setGameState((prev) => {
        const existingBlast = prev.blasts.find((b) => b.x === x && b.y === y);
        if (existingBlast?.dirKey === dirKey) return prev;
        const updatedBlasts = prev.blasts.map((b) => {
          if (b.x === x && b.y === y) return { ...b, dirKey };
          return b;
        });
        return { ...prev, blasts: updatedBlasts };
      });
    },
    [setGameState]
  );

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
      if (nextPlacementDirRef.current) nextPlacementDirRef.current = null;

      handleOpenBlastResults();

      const roundNumber = (gameState.blastHistory?.length || 0) + 1;
      const physicsReplayData =
        typeof window !== "undefined" ? window.lastBlastPhysicsState : null;

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

      if (physicsReplayData && typeof physicsReplayData.expectedScore === 'number') {
        saveHighscore({
          playerName: gameState.playerName || "Miner",
          score: physicsReplayData.expectedScore,
          efficiency: (
            (physicsReplayData.expectedRecoveryRate / 100) *
            100
          ).toFixed(1), 
          recoveryRate: physicsReplayData.expectedRecoveryRate,
          timestamp: new Date().toISOString(),
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

  const deviceInfo = useMemo(() => {
    const userAgent = navigator.userAgent;
    const isMobileUA =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        userAgent
      );
    return { isMobileUA };
  }, []);

  const calculateOptimalSizing = useCallback((processedGrid) => {
    const { dimensions } = processedGrid;
    const isMobile = deviceInfo.isMobileUA || window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
    const isLargeTabletPortrait =
      window.innerWidth >= 1024 &&
      window.innerWidth <= 1200 &&
      window.innerHeight > window.innerWidth;
    const isTabletPortrait =
      (isTablet || isLargeTabletPortrait) &&
      window.innerHeight > window.innerWidth;
    const isSmallPhone = window.innerWidth < 375 || window.innerHeight < 667;
    const isCompactLandscape =
      window.innerWidth >= 1024 &&
      window.innerHeight <= 700 &&
      window.innerHeight <= window.innerWidth;

    const preferredWidth = isSmallPhone
      ? Math.min(window.innerWidth - 24, 320)
      : isMobile
      ? Math.min(window.innerWidth - 32, 360)
      : isTabletPortrait
      ? Math.min(window.innerWidth - 64, 700)
      : isTablet
      ? Math.min(window.innerWidth * 0.65, 500)
      : isCompactLandscape
      ? Math.min(window.innerWidth * 0.5, 500)
      : 576;

    const preferredHeight = isSmallPhone
      ? Math.min(window.innerHeight * 0.4, 320)
      : isMobile
      ? Math.min(window.innerHeight * 0.45, 400)
      : isTabletPortrait
      ? Math.min(window.innerHeight * 0.55, 650)
      : isTablet
      ? Math.min(window.innerHeight * 0.5, 450)
      : isCompactLandscape
      ? Math.min(window.innerHeight * 0.75, 450)
      : 456;

    const blockSizeByWidth = Math.floor(preferredWidth / dimensions.width);
    const blockSizeByHeight = Math.floor(preferredHeight / dimensions.height);
    let blockSize = Math.min(blockSizeByWidth, blockSizeByHeight);

    const minBlockSize = isSmallPhone ? 25 : isMobile ? 28 : isTabletPortrait ? 45 : isTablet ? 35 : isCompactLandscape ? 8 : 6;
    const maxBlockSize = isSmallPhone ? 40 : isMobile ? 45 : isTabletPortrait ? 70 : isTablet ? 60 : isCompactLandscape ? 18 : 80;

    blockSize = Math.max(minBlockSize, Math.min(maxBlockSize, blockSize));
    const exactWidth = dimensions.width * blockSize;
    const exactHeight = dimensions.height * blockSize;

    setCanvasSize({ width: exactWidth, height: exactHeight });
    setBlockSize(blockSize);
  }, [deviceInfo.isMobileUA]);

  const handleCellClick = useCallback(
    (x, y) => {
      if (!gameState.canPlaceExplosives) {
        alert("Please import a new CSV file or refresh the page to continue placing explosives.");
        return;
      }

      playSound("click");
      // Note: We don't call handleCellClick(x, y) recursively here; logic is inline below:

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
        dirKey:
          nextPlacementDirRef.current && nextPlacementDirRef.current.explicit
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
    },
    [
      gameState.blasts,
      gameState.canPlaceExplosives,
      setGameState,
      gameState.blastRadius,
      selectedBlast,
      setPendingDirection,
      showToast,
      playSound
    ]
  );

  useEffect(() => {
    if (csvData && csvData !== csvDataRef.current) {
      csvDataRef.current = csvData;
      setBlastTrigger(null);
      setIsBlasting(false);
      setGridData(null);
      setIsProcessing(true);

      try {
        const processedGrid = GridDataProcessor.processCSVToGrid(csvData);

        if (
          processedGrid &&
          GridDataProcessor.validateGridData(processedGrid)
        ) {
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
      } catch {
        setGridData(null);
      } finally {
        setIsProcessing(false);
      }
    }
  }, [csvData, onGridProcessed, calculateOptimalSizing, setGameState]);

  const restoreGameState = useCallback(
    (loadedState) => {
      setGridData({
        grid: loadedState.currentGrid || loadedState.simulationSnapshot?.grid,
        dimensions:
          loadedState.gridDimensions ||
          loadedState.initialGridState?.dimensions,
        metadata:
          loadedState.gridMetadata || loadedState.initialGridState?.metadata,
      });
      setOriginalGridData({
        grid: loadedState.originalGrid || loadedState.initialGridState?.grid,
        dimensions:
          loadedState.gridDimensions ||
          loadedState.initialGridState?.dimensions,
        metadata:
          loadedState.gridMetadata || loadedState.initialGridState?.metadata,
      });

      setGameState((prev) => ({
        ...prev,
        playerName: loadedState.gameState.playerName,
        score: loadedState.gameState.score,
        blasts: loadedState.gameState.blasts,
        recoveryHistory: loadedState.gameState.recoveryHistory,
        blastHistory: loadedState.gameState.blastHistory || prev.blastHistory,
        canPlaceExplosives: loadedState.gameState.canPlaceExplosives,
        grid: loadedState.currentGrid || loadedState.simulationSnapshot?.grid,
        materialsRemainedAfterDestroy:
          loadedState.gameState.materialsRemainedAfterDestroy || 0,
        numberOfMaterialsDestroyed:
          loadedState.gameState.numberOfMaterialsDestroyed || 0,
      }));

      if (loadedState.physicsReplayData && typeof window !== "undefined") {
        console.log("Restoring physics replay data...");
        window.lastBlastPhysicsState = loadedState.physicsReplayData;
      } else {
        window.lastBlastPhysicsState = null;
      }

      setSelectedBlast(loadedState.selectedBlast || null);
      setFileResetKey((prev) => prev + 1);
      if (
        loadedState.simulationSnapshot &&
        loadedState.simulationSnapshot.fallenDebris
      ) {
        setFallenDebris(loadedState.simulationSnapshot.fallenDebris);
        // Force results modal open if loading a completed game
        if (loadedState.simulationSnapshot.fallenDebris.length > 0) {
            setShowBlastResults(true);
        }
      }
    },
    [setGameState, setGridData, setOriginalGridData, setFileResetKey]
  );

  const handleLoadFromStorage = (saveData) => {
    try {
      restoreGameState(saveData);
      showToast("Game loaded from storage!", "success");
    } catch {
      showToast("Failed to load save data.", "error");
    }
  };

  const handleLoadSimulationFile = useCallback(
    async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setIsProcessing(true);
      try {
        const loadedState = await loadSimulation(file);
        restoreGameState(loadedState);
        showToast(`File loaded successfully!`, "success");
      } catch (error) {
        showToast(error.message, "error");
      } finally {
        setIsProcessing(false);
        setLoadFileInputKey((prev) => prev + 1);
      }
    },
    [restoreGameState, showToast]
  );

  const recoveryHistory = gameState.recoveryHistory;
  const blastHistory = gameState.blastHistory;
  const lastRecoveryDetail =
    recoveryHistory?.length > 0
      ? recoveryHistory[recoveryHistory.length - 1]
      : { recoveredCount: 0, efficiency: 0 };
  const lastBlastRecord =
    blastHistory?.length > 0
      ? blastHistory[blastHistory.length - 1]
      : { recovery: 0, dilution: 0, score: 0 };

  const handleSaveSimulation = () => {
    if (isBlasting) {
      showToast("Cannot save while a blast is in progress.", "error");
      return;
    }
    if (!gridData || !originalGridData) {
      showToast("Cannot save, grid data is not available.", "error");
      return;
    }

    const physicsReplayData =
      typeof window !== "undefined" ? window.lastBlastPhysicsState : null;

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
    if (!gridData || !originalGridData) {
      showToast("Cannot export, grid data is not available.", "error");
      return;
    }

    const physicsReplayData =
      typeof window !== "undefined" ? window.lastBlastPhysicsState : null;

    const fullSaveState = {
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
        score: gameState.score,
        blasts: gameState.blasts,
        blastHistory: gameState.blastHistory,
        recoveryHistory: gameState.recoveryHistory,
        canPlaceExplosives: gameState.canPlaceExplosives,
        materialsRemainedAfterDestroy: gameState.materialsRemainedAfterDestroy,
        numberOfMaterialsDestroyed: gameState.numberOfMaterialsDestroyed,
      },
      physicsReplayData: physicsReplayData ? { ...physicsReplayData } : null,
    };

    const timestamp = new Date().toLocaleTimeString("en-GB").replace(/:/g, "-");
    const datestamp = new Date()
      .toLocaleDateString("en-GB")
      .replace(/\//g, "-");

    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(fullSaveState, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute(
      "download",
      "simulation_save_" + datestamp + "_" + timestamp + ".json"
    );
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();

    showToast("Full simulation saved to file!", "success");
  };

  if (!csvData)
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Upload a CSV file to visualize the ore grid</p>
      </div>
    );
  if (isProcessing || !gridData)
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
        <p>Processing grid data...</p>
      </div>
    );
  
  // Calculate if we should show the results button
  const canViewResults = fallenDebris && fallenDebris.length > 0;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div 
        className={`fixed inset-0 bg-white z-[9999] pointer-events-none transition-opacity duration-300 ${showFlash ? 'opacity-80' : 'opacity-0'}`}
      />
      <LoadGameModal
        show={showLoadModal}
        onClose={() => setShowLoadModal(false)}
        onLoadGame={handleLoadFromStorage}
        loadFileInputKey={loadFileInputKey}
        onFileSelect={handleLoadSimulationFile}
      />
      <LeaderboardModal
        show={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
      />

      {/* Mobile & Tablet Layout */}
      <div
        className="flex-1 overflow-y-auto pb-4 px-2 sm:px-3 md:px-4"
        style={{
          display:
            window.innerWidth < 1024 ||
            (window.innerWidth < 1400 && window.innerHeight > window.innerWidth)
              ? "flex"
              : "none",
          flexDirection: "column",
        }}
      >
        <h2 className="text-sm sm:text-base md:text-lg font-bold mb-2 sm:mb-3 md:mb-4 text-center text-amber-500">
          2D Ore Grid Visualization
        </h2>

        <GridInfo
          gridData={gridData}
          blockSize={blockSize}
          canvasSize={canvasSize}
        />

        <div className="flex justify-center mb-3 sm:mb-4 md:mb-6">
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
            // PASS THE PROP HERE
            initialBlastCompleted={fallenDebris && fallenDebris.length > 0}
          />
        </div>

        <div className="mt-4 sm:mt-5 md:mt-8 mb-6">
          <GridLegend
            oreTypes={gridData.metadata.oreTypes}
            onTriggerBlast={handleTriggerBlast}
            resetCanvas={handleCanvasReset}
            isBlasting={isBlasting}
            selectedBlast={selectedBlast}
            onSelectDirection={onSelectDirection}
            onSaveSimulation={handleSaveSimulation}
            loadFileInputKey={loadFileInputKey}
            onOpenLeaderboard={() => setShowLeaderboard(true)}
            onOpenLoadModal={() => setShowLoadModal(true)}
            canViewResults={canViewResults}
            onOpenBlastResults={() => setShowBlastResults(true)}
          />
        </div>
      </div>

      {/* Desktop Layout */}
      <div
        className="overflow-y-auto"
        style={{
          display:
            (window.innerWidth >= 1024 &&
              window.innerHeight <= window.innerWidth) ||
            window.innerWidth >= 1400
              ? "block"
              : "none",
          paddingTop: window.innerHeight <= 700 ? "0px" : undefined,
          paddingBottom: window.innerHeight <= 700 ? "4px" : undefined,
          height: window.innerHeight <= 700 ? "100%" : undefined,
        }}
      >
        <div
          className="lg:absolute lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:max-w-[70%] lg:px-0"
          style={{
            marginLeft:
              window.innerHeight <= 700 && window.innerWidth >= 1024
                ? "-120px"
                : undefined,
          }}
        >
          <h2
            className="text-xl font-bold text-left text-amber-500"
            style={{
              marginBottom: window.innerHeight <= 700 ? "4px" : "16px",
              marginTop: window.innerHeight <= 700 ? "0" : undefined,
            }}
          >
            2D Ore Grid Visualization
          </h2>

          <GridInfo
            gridData={gridData}
            blockSize={blockSize}
            canvasSize={canvasSize}
          />

          <div
            className="flex justify-center"
            style={{
              marginBottom: window.innerHeight <= 700 ? "2px" : "16px",
              marginTop: window.innerHeight <= 700 ? "2px" : undefined,
            }}
          >
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
              // PASS THE PROP HERE TOO
              initialBlastCompleted={fallenDebris && fallenDebris.length > 0}
              cellGap={
                window.innerWidth >= 1024 && window.innerHeight <= 700 ? 4 : 8
              }
            />
          </div>
        </div>

        <div className="lg:absolute lg:top-8 lg:right-4 lg:w-66 lg:z-50">
          <GridLegend
            oreTypes={gridData.metadata.oreTypes}
            onTriggerBlast={handleTriggerBlast}
            resetCanvas={handleCanvasReset}
            onSaveSimulation={handleSaveSimulation}
            isBlasting={isBlasting}
            selectedBlast={selectedBlast}
            onSelectDirection={onSelectDirection}
            loadFileInputKey={loadFileInputKey}
            onOpenLeaderboard={() => setShowLeaderboard(true)}
            onOpenLoadModal={() => setShowLoadModal(true)}
            canViewResults={canViewResults}
            onOpenBlastResults={() => setShowBlastResults(true)}
          />
        </div>
        <div className="absolute top-4 left-4 z-50 flex gap-2">
          <button 
            onClick={toggleMute}
            className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-all border border-white/10"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          
          <button 
            onClick={handleUndoBlast}
            disabled={isBlasting || gameState.blasts.length === 0}
            className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-all border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Undo Last Placement (Ctrl+Z)"
          >
            <Undo2 size={20} />
          </button>
        </div>
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
        onLoad={handleLoadSimulationFile}
        loadFileInputKey={loadFileInputKey}
        onExportSimulation={handleExportSimulation}
      />
    </div>
  );
};

export default OreGridVisualization;