import { ArrowClockwise, ArrowCounterClockwise, Circle, Cursor, PencilSimple, Square } from '@phosphor-icons/react'
import type { ComponentType } from 'react'
import type { BoardController, ControllerSnapshot } from '../app/controller'
import type { ToolName } from '../tools/tools'

const TOOLS: Array<{ name: ToolName; label: string; key: string; Icon: ComponentType<{ size?: number; weight?: 'regular' }> }> = [
  { name: 'select', label: 'Select', key: 'V', Icon: Cursor },
  { name: 'rect', label: 'Rectangle', key: 'R', Icon: Square },
  { name: 'ellipse', label: 'Ellipse', key: 'O', Icon: Circle },
  { name: 'freehand', label: 'Freehand', key: 'P', Icon: PencilSimple },
]

const SWATCHES: Array<{ color: string; label: string }> = [
  { color: '#1e1e1e', label: 'Ink' },
  { color: '#2f5bea', label: 'Cobalt' },
  { color: '#e03131', label: 'Red' },
  { color: '#2b8a3e', label: 'Green' },
  { color: '#f08c00', label: 'Amber' },
]

export function Toolbar({ controller, snap }: { controller: BoardController; snap: ControllerSnapshot }) {
  const filled = snap.style.fill !== 'transparent'
  return (
    <div className="toolbar" role="toolbar" aria-label="Drawing tools">
      <div className="group">
        {TOOLS.map(({ name, label, key, Icon }) => (
          <button
            key={name}
            type="button"
            className="btn"
            data-testid={`tool-${name}`}
            aria-label={`${label} (${key})`}
            aria-pressed={snap.tool === name}
            onClick={() => controller.setTool(name)}
          >
            <Icon size={20} weight="regular" />
            <span className="hint">{key}</span>
          </button>
        ))}
      </div>
      <div className="group">
        {SWATCHES.map(({ color, label }) => (
          <button
            key={color}
            type="button"
            className="swatch"
            aria-label={`Stroke ${label}`}
            aria-pressed={snap.style.stroke === color}
            style={{ background: color }}
            onClick={() => controller.setStyle({ stroke: color })}
          />
        ))}
        <button
          type="button"
          className="btn"
          data-testid="fill-toggle"
          aria-label="Fill shapes"
          aria-pressed={filled}
          onClick={() => controller.setStyle({ fill: filled ? 'transparent' : snap.style.stroke })}
        >
          Fill
        </button>
      </div>
      <div className="group">
        <button type="button" className="btn" data-testid="undo" aria-label="Undo" disabled={!snap.canUndo} onClick={() => controller.undo()}>
          <ArrowCounterClockwise size={20} weight="regular" />
        </button>
        <button type="button" className="btn" data-testid="redo" aria-label="Redo" disabled={!snap.canRedo} onClick={() => controller.redo()}>
          <ArrowClockwise size={20} weight="regular" />
        </button>
      </div>
    </div>
  )
}
