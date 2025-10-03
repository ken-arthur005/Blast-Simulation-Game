import React, { useState } from 'react';
import { Link } from 'react-router';
import { FaTrophy } from "react-icons/fa";

function HomePage() {
  const [clicked, setClicked] = useState(false);
  

  return (
    <div className="background text-center fixed inset-0 flex flex-col justify-center h-screen w-full p-3 sm:p-4 lg:p-4 overflow-hidden">
      {/* Title Section */}
      <div className="ui-font text-center flex-shrink-0 pt-1 sm:pt-12 lg:pt-24 ">
        <h1
          className="text-[32px] xs:text-[40px] sm:text-[60px] md:text-[80px] lg:text-[100px] xl:text-[140px] 
                     tracking-[3px] xs:tracking-[4px] sm:tracking-[6px] md:tracking-[8px] xl:tracking-[14px] 
                     leading-[32px] xs:leading-[40px] sm:leading-[60px] md:leading-[80px] lg:leading-[120px] xl:leading-[120px] 
                     font-[400px]">
          <span className="text-transparent bg-clip-text bg-linear-to-r from-[#3E1E68] to-[#C19A88] text-stroke block">
            ROCK
          </span>
          <span className="text-transparent bg-clip-text bg-linear-to-r from-[#3E1E68] to-[#C19A88] text-stroke block">
            BLASTERZ
          </span>
        </h1>
        <h2
          className="ui-font text-[10px] xs:text-[12px] sm:text-[16px] md:text-[20px] lg:text-[24px] xl:text-[24px] 
                     tracking-[1px] xs:tracking-[1.2px] sm:tracking-[1.6px] md:tracking-[2px] lg:tracking-[2.4px] xl:tracking-[2.8px] 
                     text-center">
          A realistic 2d rock blasting simulation
        </h2>
      </div>

      {/* Form Section */}
      <div className="flex flex-col items-center w-full max-w-[872px] mx-auto sm:mt-2">
        <div
          className="ui-font relative rounded-[12px] sm:rounded-[16px] lg:rounded-[20px] 
                     bg-[radial-gradient(50%_50%_at_50%_50%,_#4E3063_0%,_#9E61C9_100%)] 
                     w-full max-w-[280px] xs:max-w-[300px] sm:max-w-[400px] md:max-w-[500px] lg:max-w-[650px] xl:max-w-[720px] 
                     min-h-[100px] xs:min-h-[110px] sm:min-h-[130px] lg:min-h-[150px] xl:min-h-[100px] 
                     flex flex-col justify-center items-center sm:py-5 lg:py-6 ">
          <h2
            className="text-[#F6DBA3] text-center text-shadow 
                       text-[18px] xs:text-[20px] sm:text-[28px] md:text-[36px] lg:text-[44px] xl:text-[52px] 
                       tracking-[1.8px] xs:tracking-[2px] sm:tracking-[2.8px] md:tracking-[3.6px] lg:tracking-[4.4px] xl:tracking-[5.2px] 
                       text-stroke mb-2 sm:mb-2">
            What is your name?
          </h2>
          <input
            className="w-full max-w-[240px] xs:max-w-[260px] sm:max-w-[350px] md:max-w-[450px] lg:max-w-[580px] xl:max-w-[680px] 
                       h-[28px] xs:h-[30px] sm:h-[38px] lg:h-[44px] xl:h-[50px] 
                       rounded-[12px] sm:rounded-[16px] lg:rounded-[20px] 
                       bg-[#F6DBA3] opacity-75
                       text-sm xs:text-base sm:text-lg lg:text-xl xl:text-2xl 
                       px-2 sm:px-3 lg:px-4 
                       font-semibold placeholder:text-[#7A6F6F] text-[#3B2F2F] text-center uppercase"
            placeholder="Enter name"
          />
        </div>

        {/* Continue button box */}
        <div
          className="w-full max-w-[240px] xs:max-w-[260px] sm:max-w-[320px] md:max-w-[400px] lg:max-w-[500px] xl:max-w-[580px]  h-[36px] xs:h-[38px] sm:h-[48px] lg:h-[58px] xl:h-[68px] 
                     rounded-b-[12px] sm:rounded-b-[16px] lg:rounded-b-[20px] 
                     bg-[#9E61C9] mx-auto flex items-center justify-center ui-font pb-3">
          <Link to="/csvfile" className="w-full flex justify-center">
            <button
              onClick={() => {
                setClicked(true);
                setTimeout(() => setClicked(false), 300);
              }}
              className={`w-full max-w-[200px] xs:max-w-[220px] sm:max-w-[260px] md:max-w-[300px] lg:max-w-[340px] xl:max-w-[380px] 
                          bg-[radial-gradient(339.72%_50%_at_50%_50%,_#D9D9D9_0%,_#737373_100%)] 
                          backdrop-blur-[2px] rounded-[12px] sm:rounded-[16px] lg:rounded-[20px] 
                          text-center text-[#5A3C62] 
                          text-[14px] xs:text-[16px] sm:text-[24px] md:text-[30px] lg:text-[36px] xl:text-[42px] 
                          tracking-wide 
                          transition transform ${clicked ? "scale-105" : ""} `}>
              Continue
            </button>
          </Link>
        </div>
      </div>

      {/* Leaderboard Button */}
      <button
        className="w-full max-w-[200px] xs:max-w-[220px] sm:max-w-[250px] lg:max-w-[280px] 
                   h-[36px] xs:h-[38px] sm:h-[44px] lg:h-[52px] 
                   rounded-[16px] sm:rounded-[20px] lg:rounded-[25px] 
                   mx-auto mt-6 sm:mt-8 border-[#5A3C62] bg-transparent border-2 
                   flex justify-center items-center gap-2 sm:gap-3 lg:gap-4">
        <svg xmlns="http://www.w3.org/2000/svg"
          width="16" height="22"
          className="xs:w-[18px] xs:h-[25px] sm:w-[22px] sm:h-[30px] lg:w-[18px] lg:h-[38px]"
          viewBox="0 0 36 50" fill="none">
          <path d="M18.1477 0.159998C17.8656 0.149869 17.5907 0.25057 17.382 0.440545L14.3339 3.20172L10.2291 2.3432C9.97117 2.28951 9.70254 2.33192 9.47372 2.46245C9.24491 2.59298 9.07168 2.80263 8.98664 3.05195L7.65141 6.95851L3.64149 8.20094C3.38451 8.28037 3.16642 8.45282 3.02988 8.68455C2.89333 8.91629 2.84816 9.19063 2.90321 9.45391L3.76172 13.5587L1.00055 16.6068C0.820331 16.8055 0.720505 17.0642 0.720505 17.3324C0.720505 17.6007 0.820331 17.8593 1.00055 18.058L3.76172 21.1061L2.90321 25.2109C2.84951 25.4688 2.89192 25.7375 3.02245 25.9663C3.15298 26.1951 3.36263 26.3683 3.61196 26.4534L7.51852 27.7886L8.28 30.246V48.76C8.28001 48.9441 8.32707 49.1251 8.41672 49.2859C8.50637 49.4467 8.63563 49.5819 8.79223 49.6787C8.94883 49.7755 9.12757 49.8307 9.31149 49.839C9.4954 49.8473 9.67838 49.8084 9.84305 49.7261L18 45.6466L26.157 49.7261C26.3216 49.8084 26.5046 49.8473 26.6885 49.839C26.8724 49.8307 27.0512 49.7755 27.2078 49.6787C27.3644 49.5819 27.4936 49.4467 27.5833 49.2859C27.6729 49.1251 27.72 48.9441 27.72 48.76V29.8136L28.3444 28.0312L32.3585 26.7887C32.6155 26.7093 32.8336 26.5369 32.9701 26.3051C33.1067 26.0734 33.1518 25.7991 33.0968 25.5358L32.2383 21.4288L34.9995 18.3808C35.1779 18.1844 35.2778 17.9292 35.2801 17.6639C35.2825 17.3986 35.1871 17.1417 35.0121 16.9422L32.2362 13.7845L33.0968 9.66906C33.1505 9.41116 33.1081 9.14253 32.9776 8.91372C32.847 8.6849 32.6374 8.51168 32.3881 8.42664L28.4815 7.0914L27.2391 3.08148C27.1596 2.82451 26.9872 2.60642 26.7555 2.46987C26.5237 2.33333 26.2494 2.28816 25.9861 2.3432L21.8813 3.20383L18.8332 0.440545C18.6449 0.269146 18.4021 0.169784 18.1477 0.159998ZM18.1076 2.69758L20.8392 5.17187C20.9653 5.28619 21.1167 5.36909 21.2809 5.41381C21.4451 5.45854 21.6176 5.46381 21.7842 5.42922L25.4672 4.6593L26.5809 8.25578C26.6312 8.41823 26.7191 8.56652 26.8375 8.68858C26.9559 8.81064 27.1014 8.90302 27.2623 8.9582L30.787 10.1605L30.0108 13.8709C29.9765 14.0352 29.981 14.2051 30.0238 14.3673C30.0667 14.5295 30.1467 14.6795 30.2576 14.8054L32.753 17.6446L30.2681 20.3868C30.1535 20.5131 30.0704 20.6648 30.0257 20.8294C29.9809 20.9941 29.9758 21.1669 30.0108 21.3339L30.7807 25.0148L27.1842 26.1285C27.0228 26.1784 26.8754 26.2655 26.7538 26.3827C26.6322 26.5 26.5397 26.6441 26.4839 26.8035L25.2858 30.2291L21.5691 29.4508C21.4021 29.4158 21.2292 29.4209 21.0646 29.4657C20.9 29.5104 20.7483 29.5935 20.622 29.7081L17.8924 32.1824L15.1608 29.7081C15.0347 29.5938 14.8834 29.5109 14.7191 29.4662C14.5549 29.4215 14.3824 29.4162 14.2158 29.4508L10.5328 30.2207L9.41906 26.6242C9.36881 26.4618 9.28091 26.3135 9.16251 26.1914C9.04412 26.0694 8.89858 25.977 8.73774 25.9218L5.21297 24.7195L5.98922 21.0091C6.02417 20.8421 6.01907 20.6692 5.97434 20.5046C5.9296 20.34 5.84652 20.1883 5.73188 20.062L3.25758 17.3324L5.73188 14.6008C5.8462 14.4747 5.9291 14.3233 5.97382 14.1591C6.01854 13.9949 6.02382 13.8224 5.98922 13.6558L5.2193 9.97281L8.81578 8.85906C8.97823 8.8088 9.12652 8.7209 9.24858 8.60251C9.37064 8.48411 9.46302 8.33857 9.51821 8.17773L10.7205 4.65297L14.4309 5.42922C14.5979 5.46416 14.7708 5.45906 14.9354 5.41433C15.1 5.3696 15.2517 5.28651 15.378 5.17187L18.1076 2.69758ZM18 6.64C12.024 6.64 7.2 11.464 7.2 17.44C7.2 23.416 12.024 28.24 18 28.24C23.976 28.24 28.8 23.416 28.8 17.44C28.8 11.464 23.976 6.64 18 6.64ZM18 8.8C22.824 8.8 26.64 12.616 26.64 17.44C26.64 22.264 22.824 26.08 18 26.08C13.176 26.08 9.36 22.264 9.36 17.44C9.36 12.616 13.176 8.8 18 8.8ZM14.1188 31.6783L17.1668 34.4395C17.3655 34.6197 17.6242 34.7195 17.8924 34.7195C18.1607 34.7195 18.4193 34.6197 18.618 34.4395L21.6661 31.6783L25.56 32.4925V47.0134L18.483 43.4739C18.3331 43.3989 18.1677 43.3599 18 43.3599C17.8323 43.3599 17.6669 43.3989 17.517 43.4739L10.44 47.0134V32.4482L14.1188 31.6783Z" fill="black"/>
        </svg>
        <h3
          className="leaderboard-font text-[12px] xs:text-[14px] sm:text-[18px] lg:text-[20px] font-bold tracking-wide">
          LeaderBoard
        </h3>
      </button>
    </div>
  );
}

export default HomePage;
