import React, { useState, useCallback } from 'react'
import { GridCell } from '../GridCell/GridCell'
import { CellType, Coordinate, Orientation } from '../../types'
import { generateAirplanePosition, getAllAirplaneCoordinates } from '../../utils/airplaneUtils'
import './GameGrid.css'

interface GameGridProps {
  grid: CellType[][]
  isOwn: boolean  // 是否是自己的网格
  title: string
  onCellClick?: (x: number, y: number) => void
  onAirplanePlace?: (x: number, y: number, orientation: Orientation) => void
  canPlaceAirplane?: boolean  // 是否可以放置飞机
  disabled?: boolean
}

/**
 * 游戏网格组件
 */
export const GameGrid: React.FC<GameGridProps> = ({
  grid,
  isOwn,
  title,
  onCellClick,
  onAirplanePlace,
  canPlaceAirplane = false,
  disabled = false
}) => {
  const [previewPosition, setPreviewPosition] = useState<Coordinate[]>([])
  const [currentOrientation, setCurrentOrientation] = useState<Orientation>(Orientation.VERTICAL)

  // 处理鼠标进入格子
  const handleMouseEnter = useCallback((x: number, y: number) => {
    if (!canPlaceAirplane || disabled) {
      return
    }

    // 生成预览飞机位置
    const airplanePosition = generateAirplanePosition(x, y, currentOrientation)
    if (airplanePosition) {
      const previewCoords = getAllAirplaneCoordinates(airplanePosition)
      setPreviewPosition(previewCoords)
    } else {
      setPreviewPosition([])
    }
  }, [canPlaceAirplane, disabled, currentOrientation])

  // 处理鼠标离开格子
  const handleMouseLeave = useCallback(() => {
    setPreviewPosition([])
  }, [])

  // 处理格子点击
  const handleCellClick = useCallback((x: number, y: number) => {
    if (disabled) {
      return
    }

    if (canPlaceAirplane && onAirplanePlace) {
      onAirplanePlace(x, y, currentOrientation)
    } else if (onCellClick) {
      onCellClick(x, y)
    }
  }, [disabled, canPlaceAirplane, onAirplanePlace, onCellClick, currentOrientation])

  // 切换飞机方向
  const toggleOrientation = () => {
    if (canPlaceAirplane) {
      setCurrentOrientation(prev => 
        prev === Orientation.VERTICAL ? Orientation.HORIZONTAL : Orientation.VERTICAL
      )
    }
  }

  // 检查是否为预览位置
  const isPreviewPosition = (x: number, y: number): boolean => {
    return previewPosition.some(coord => coord.x === x && coord.y === y)
  }

  // 渲染网格
  const renderGrid = () => {
    const rows = []
    
    for (let y = 0; y < 10; y++) {
      const cells = []
      
      for (let x = 0; x < 10; x++) {
        const cellType = grid[y][x]
        const isPreview = isPreviewPosition(x, y)
        
        cells.push(
          <GridCell
            key={`${x}-${y}`}
            cellType={cellType}
            x={x}
            y={y}
            isOwn={isOwn}
            onClick={handleCellClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            isPreview={isPreview}
            disabled={disabled}
          />
        )
      }
      
      rows.push(
        <div key={y} className="game-grid__row">
          {cells}
        </div>
      )
    }
    
    return rows
  }

  return (
    <div className="game-grid">
      <div className="game-grid__header">
        <h3 className="game-grid__title">{title}</h3>
        {canPlaceAirplane && (
          <div className="game-grid__controls">
            <button 
              className="game-grid__orientation-btn"
              onClick={toggleOrientation}
              disabled={disabled}
            >
              方向: {currentOrientation === Orientation.VERTICAL ? '垂直' : '水平'}
            </button>
          </div>
        )}
      </div>
      
      <div className="game-grid__container">
        {/* 坐标标签 */}
        <div className="game-grid__coordinates">
          <div className="game-grid__coordinates-top">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className="game-grid__coordinate-label">
                {i}
              </span>
            ))}
          </div>
        </div>
        
        <div className="game-grid__main">
          <div className="game-grid__coordinates-left">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className="game-grid__coordinate-label">
                {i}
              </span>
            ))}
          </div>
          
          <div className="game-grid__board">
            {renderGrid()}
          </div>
        </div>
      </div>
      
      {canPlaceAirplane && (
        <div className="game-grid__instructions">
          <p>点击网格放置飞机，点击"方向"按钮切换飞机朝向</p>
        </div>
      )}
    </div>
  )
}