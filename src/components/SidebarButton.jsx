import React from 'react';


function SidebarButton({ iconClass, name, isActive, onMouseEnter, onClick }) {
  const activeClass = isActive ? 'active' : '';

  return (
    <div
      className={`sidebar-button ${activeClass}`}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      <i className={iconClass}></i>
      <span>{name}</span>
    </div>
  );
}

export default SidebarButton;
