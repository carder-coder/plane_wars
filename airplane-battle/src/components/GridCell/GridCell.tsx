import React from 'react'
import { CellType } from '../../types'
import './GridCell.css'

interface GridCellProps {
  cellType: CellType
  x: number
  y: number
  isOwn: boolean  // 是否是自己的网格
  onClick?: (x: number, y: number) => void
  onMouseEnter?: (x: number, y: number) => void
  onMouseLeave?: () => void
  isPreview?: boolean  // 是否是预览状态
  disabled?: boolean
}

/**
 * 网格单元格组件
 */
export const GridCell: React.FC<GridCellProps> = ({
  cellType,
  x,
  y,
  isOwn,
  onClick,
  onMouseEnter,
  onMouseLeave,
  isPreview = false,
  disabled = false
}) => {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick(x, y)
    }
  }

  const handleMouseEnter = () => {
    if (!disabled && onMouseEnter) {
      onMouseEnter(x, y)
    }
  }

  const getCellContent = () => {
    if (isPreview) {
      return '✈️'  // 预览飞机
    }

    if (isOwn) {
      // 自己的网格
      switch (cellType) {
        case CellType.HEAD:
          return '🛩️'  // 机头
        case CellType.WINGS:
          return '✈️'  // 机翅
        case CellType.BODY:
          return '🚁'  // 机身
        case CellType.TAIL:
          return '🛫'  // 机尾
        case CellType.HIT:
          return '💥'  // 被击中
        case CellType.MISS:
          return '🌊'  // 未击中
        case CellType.EMPTY:
        default:
          return ''
      }
    } else {
      // 对手的网格
      switch (cellType) {
        case CellType.HIT:
          return '💥'  // 击中对方
        case CellType.MISS:
          return '❌'  // 未击中
        case CellType.EMPTY:
        default:
          return '❓'  // 未探索
      }
    }
  }

  const getCellClassName = () => {
    const baseClass = 'grid-cell'
    const classes = [baseClass]

    if (isOwn) {
      classes.push('grid-cell--own')
    } else {
      classes.push('grid-cell--enemy')
    }

    if (isPreview) {
      classes.push('grid-cell--preview')
    }

    if (disabled) {
      classes.push('grid-cell--disabled')
    }

    if (cellType !== CellType.EMPTY) {
      classes.push(`grid-cell--${cellType}`)
    }

    return classes.join(' ')
  }

  return (
    <div
      className={getCellClassName()}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onMouseLeave}
      data-x={x}
      data-y={y}
    >
      <span className="grid-cell__content">
        {getCellContent()}
      </span>
      <span className="grid-cell__coordinates">
        {x},{y}
      </span>
    </div>
  )
}