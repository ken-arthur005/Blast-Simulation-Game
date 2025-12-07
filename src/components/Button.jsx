import React from "react";

const Button = ({
  label,
  onClick,
  disabled = false,
  color = "blue",
  className = "",
}) => {
  const baseStyle =
    "mt-10 text-white p-3 rounded disabled:bg-gray-400 disabled:cursor-not-allowed hover:cursor-pointer transition";

  const colorStyles = {
    red: "bg-red-500 hover:bg-red-600",
    blue: "bg-blue-600 hover:bg-blue-500",
    green: "bg-green-600 hover:bg-green-500",
    gray: "bg-gray-500 hover:bg-gray-400",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${colorStyles[color]} ${className}`}
    >
      {label}
    </button>
  );
};

export default Button;
