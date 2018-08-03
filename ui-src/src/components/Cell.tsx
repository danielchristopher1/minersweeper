import * as React from 'react';
import {connect} from 'react-redux';
import { Grid } from 'react-virtualized';

import {Action, ActionType, GameParams, MoveDefinition, XY} from '../../../minesweeper'

import './Cell.css';

import {Hash} from '../../../holochain';

import Jdenticon from './Jdenticon';

import CellMatrix from '../CellMatrix';
import {fetchJSON, CELL_SIZE, DEBUG_MODE} from '../common'
import store from '../store'

type CellProps = {
  columnIndex: number,
  gameHash: Hash,
  rowIndex: number,
  style: any,
  parent: Grid,
  myActions: number,
}

class Cell extends React.Component<CellProps, {}> {

  public render() {
    const {matrix, gameHash} = store.getState().currentGame!
    const {style} = this.props
    const pos = this.getPos()

    if (!matrix.isInBounds(pos.x, pos.y)) {
      // empty out-of-bound cells to create the margin
      return <div />
    }

    const numAdjacent = matrix.getAdjacentMines(pos)
    const flag = matrix.getFlag(pos)
    const isMine = matrix.isMine(pos)
    const isRevealed = matrix.isRevealed(pos)

    const isRevealedMine = isRevealed && isMine
    const isNumber = (isRevealed || flag) && numAdjacent > 0
    const isCorrectFlag = flag && isMine
    const isFalseFlag = flag && !isMine

    const revealedClass = isRevealed ? "revealed" : ""
    const mineClass = isMine && (isRevealed || DEBUG_MODE) ? "mine" : ""

    const mistakeClass = (isRevealedMine || isFalseFlag) ? "mistake" : ""

    const numberClass =
      numAdjacent > 0 ? `num-${numAdjacent}` : ""


    let content: JSX.Element | null = null
    if (isRevealedMine) {
      content = <img src="/images/dogecoin.png"/>
    } else if (isCorrectFlag) {
      content = <Jdenticon size={CELL_SIZE - 2} hash={flag} />
    } else if (isNumber) {
      content = <span className={`number ${numberClass}`}>{ numAdjacent }</span>
    }

    const handleLeftClick = isNumber ? this.handleAutoReveal : this.handleReveal
    const handleRightClick = isNumber ? this.handleAutoReveal : this.handleFlag

    return <div
      className={`Cell ${revealedClass} ${mineClass} ${numberClass} ${mistakeClass}`}
      style={style}
      onClick={ handleLeftClick }
      onContextMenu={ handleRightClick }
    >
      { content }
    </div>
  }

  private handleReveal = e => {
    e.preventDefault()
    this.handleMove('reveal')
  }

  private handleFlag = e => {
    e.preventDefault()
    this.handleMove('flag')
  }

  private handleAutoReveal = e => {
    e.preventDefault()
    const pos = this.getPos()
    const {matrix} = store.getState().currentGame!

    // XXX: modifying state outside of a reducer!!!
    const reveals = matrix.autoReveal(pos)

    this.redrawNeighborhood()

    reveals.forEach(revealPos => {
      this.makeMove('reveal', revealPos)
    })
  }

  private getPos = () => {
    const {columnIndex, rowIndex} = this.props
    return {x: columnIndex, y: rowIndex}
  }

  private handleMove = (actionType) => {
    const pos = this.getPos()
    const {currentGame, whoami} = store.getState()
    const {matrix} = currentGame!
    if ((actionType === "flag" || actionType === "reveal") && (matrix.isRevealed(pos) || matrix.isFlagged(pos))) {
      // can't flag or reveal a revealed square
      return;
    }

    // XXX: modifying state outside of a reducer!!!
    matrix.takeAction({
      actionType,
      position: pos,
      agentHash: whoami!.agentHash
    })

    this.forceUpdate()
    this.makeMove(actionType, pos)
  }

  private makeMove(actionType, position) {
    const payload: MoveDefinition = {
      gameHash: this.props.gameHash,
      action: {actionType, position}
    }
    fetchJSON('/fn/minersweeper/makeMove', payload).then(ok => {
      // TODO: show score if ok
    })
  }

  private redrawNeighborhood = () => {
    // inefficient but effective way to force redraw neighbors
    // (and most of the rest of the screen as well...)
    this.props.parent.recomputeGridSize({
      columnIndex: Math.max(0, this.props.columnIndex - 4),
      rowIndex: Math.max(0, this.props.rowIndex - 4),
    })
  }

}

// TODO: check for performance?
export default connect(state => ({myActions: state.myActions}))(Cell);
