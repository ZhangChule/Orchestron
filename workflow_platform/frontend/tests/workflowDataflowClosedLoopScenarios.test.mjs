import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createInitialWorkflowState,
  findLatestBaseVersionForNode,
  markNodeAndDirectDownstreamResultsStale,
} from '../runtime/workflowExecutionCore.js'
import { createProcessParameterState } from '../runtime/workflowLogicNodes.js'
import { executeNode } from '../runtime/workflowNodeExecutor.js'
import { virtualNodeRuntimeParameterView } from '../runtime/workflowParameterBase.js'
import {
  RUN_MODES,
  executableNodesForRunMode,
} from '../runtime/workflowRunModes.js'

const DELTA_A = -0.0822910009537557
const DELTA_B = -0.07766339040841813
const DELTA_MIRROR = -0.09110084238181718

test('closed-loop run all freezes each virtual machining base from its own authored radial depth', async () => {
  const graph = createClosedLoopGraph()
  const output = await runScenario(graph, { mode: RUN_MODES.RUN_ALL })

  assertVirtualRadials(output.state, {
    'virtual-baseline': 1,
    'virtual-pass-1': 1 + DELTA_A,
    'virtual-pass-2-main': 1 + DELTA_B,
    'virtual-pass-2-branch': 1 + DELTA_B,
  })
  assertVirtualRuntimeViews(graph.nodes, output.state, {
    'virtual-baseline': 1,
    'virtual-pass-1': 1 + DELTA_A,
    'virtual-pass-2-main': 1 + DELTA_B,
    'virtual-pass-2-branch': 1 + DELTA_B,
  })
  assertAuthoredVirtualBases(graph.nodes, {
    'virtual-baseline': '1.0',
    'virtual-pass-1': '1.0',
    'virtual-pass-2-main': '1.0',
    'virtual-pass-2-branch': '1.0',
  })
})

test('closed-loop run all recomputes main and branch virtual parameters after WTC method changes', async () => {
  const graph = createClosedLoopGraph()
  graph.node('wtc-b-process').params.method = 'mirror'

  const output = await runScenario(graph, { mode: RUN_MODES.RUN_ALL })

  assertVirtualRadials(output.state, {
    'virtual-pass-1': 1 + DELTA_A,
    'virtual-pass-2-main': 1 + DELTA_MIRROR,
    'virtual-pass-2-branch': 1 + DELTA_MIRROR,
  })
  assertVirtualRuntimeViews(graph.nodes, output.state, {
    'virtual-pass-2-main': 1 + DELTA_MIRROR,
    'virtual-pass-2-branch': 1 + DELTA_MIRROR,
  })
  assertAuthoredVirtualBases(graph.nodes, {
    'virtual-pass-2-main': '1.0',
    'virtual-pass-2-branch': '1.0',
  })
})

test('closed-loop run from selected recomputes the selected main branch after upstream WTC method changes', async () => {
  const graph = createClosedLoopGraph()
  const first = await runScenario(graph, { mode: RUN_MODES.RUN_ALL })

  graph.node('wtc-b-process').params.method = 'mirror'
  const staleState = markNodeAndDirectDownstreamResultsStale(
    first.state,
    ['wtc-b-process'],
    graph.edges,
    'WTC method changed',
  )
  const output = await runScenario(graph, {
    mode: RUN_MODES.RUN_FROM_SELECTED,
    selectedNodeId: 'virtual-pass-2-main',
    workflowState: staleState,
  })

  assertVirtualRadials(output.state, {
    'virtual-pass-2-main': 1 + DELTA_MIRROR,
  })
  assertVirtualRuntimeViews(graph.nodes, output.state, {
    'virtual-pass-2-main': 1 + DELTA_MIRROR,
  })
  assert.equal(findLatestBaseVersionForNode(output.state, 'virtual-pass-2-branch').parameters.radial_depth, 1 + DELTA_B)
})

test('closed-loop run from selected recomputes the selected side branch after upstream WTC method changes', async () => {
  const graph = createClosedLoopGraph()
  const first = await runScenario(graph, { mode: RUN_MODES.RUN_ALL })

  graph.node('wtc-b-process').params.method = 'mirror'
  const staleState = markNodeAndDirectDownstreamResultsStale(
    first.state,
    ['wtc-b-process'],
    graph.edges,
    'WTC method changed',
  )
  const output = await runScenario(graph, {
    mode: RUN_MODES.RUN_FROM_SELECTED,
    selectedNodeId: 'virtual-pass-2-branch',
    workflowState: staleState,
  })

  assertVirtualRadials(output.state, {
    'virtual-pass-2-branch': 1 + DELTA_MIRROR,
  })
  assertVirtualRuntimeViews(graph.nodes, output.state, {
    'virtual-pass-2-branch': 1 + DELTA_MIRROR,
  })
  assert.equal(findLatestBaseVersionForNode(output.state, 'virtual-pass-2-main').parameters.radial_depth, 1 + DELTA_B)
})

test('modified demo flow can add a process logic virtual branch and run it from selected', async () => {
  const graph = createClosedLoopGraph()
  addExperimentalBranch(graph)

  const output = await runScenario(graph, {
    mode: RUN_MODES.RUN_FROM_SELECTED,
    selectedNodeId: 'virtual-experimental',
  })

  assertVirtualRadials(output.state, {
    'virtual-baseline': 1,
    'virtual-pass-1': 1 + DELTA_A,
    'virtual-experimental': 1 + DELTA_MIRROR,
  })
  assertVirtualRuntimeViews(graph.nodes, output.state, {
    'virtual-experimental': 1 + DELTA_MIRROR,
  })
  assertAuthoredVirtualBases(graph.nodes, {
    'virtual-experimental': '1.0',
  })
})

test('modified demo flow run all keeps added branch parameters independent from the main branch', async () => {
  const graph = createClosedLoopGraph()
  addExperimentalBranch(graph)

  const output = await runScenario(graph, { mode: RUN_MODES.RUN_ALL })

  assertVirtualRadials(output.state, {
    'virtual-pass-2-main': 1 + DELTA_B,
    'virtual-pass-2-branch': 1 + DELTA_B,
    'virtual-experimental': 1 + DELTA_MIRROR,
  })
  assertVirtualRuntimeViews(graph.nodes, output.state, {
    'virtual-pass-2-main': 1 + DELTA_B,
    'virtual-pass-2-branch': 1 + DELTA_B,
    'virtual-experimental': 1 + DELTA_MIRROR,
  })
})

async function runScenario(graph, options = {}) {
  let workflowState = options.workflowState ?? createInitialWorkflowState({
    initial_process_parameter_base: createProcessParameterState(graph.nodes),
    process_parameters: createProcessParameterState(graph.nodes),
    run_id: options.runId ?? 'run-scenario',
    status: 'running',
    workflow_id: 'closed-loop-scenario',
  })
  const executed = []
  const runnable = executableNodesForRunMode({
    edges: graph.edges,
    mode: options.mode ?? RUN_MODES.RUN_ALL,
    nodes: graph.nodes,
    selectedNodeId: options.selectedNodeId,
    workflowState,
  })

  for (const node of runnable) {
    const output = await executeNode(node, workflowState, {
      edges: graph.edges,
      nodes: graph.nodes,
      runners: scenarioRunners(),
    })
    workflowState = output.state
    executed.push(node.id)
  }

  return { executed, state: workflowState }
}

function scenarioRunners() {
  return {
    virtualMachiningWallErrorPrediction: async (node, workflowState) => {
      const radialDepth = Number(workflowState.process_parameters?.radial_depth)
      return {
        raw_response: {
          result: {
            points: wallErrorPoints(radialDepth),
            summary: { max: 0.12, mean: 0.08 },
          },
          status: 'succeeded',
        },
        result: {
          summary: { max: 0.12, mean: 0.08, radial_depth: radialDepth },
          type: 'wall_error',
          wallErrorPoints: wallErrorPoints(radialDepth),
        },
      }
    },
    wallThicknessCompensation: async (node) => {
      const delta = deltaForMethod(node.params?.method)
      return {
        raw_response: { status: 'succeeded' },
        result: {
          method: node.params?.method,
          plan: { delta_radial_depth: delta },
          type: 'compensation_plan',
        },
      }
    },
  }
}

function createClosedLoopGraph() {
  const nodes = [
    virtualNode('virtual-baseline'),
    conditionNode('condition-a', '0.05'),
    ...wtcGroup('wtc-a', 'stiffness_based'),
    parameterUpdateNode('parameter-update-a'),
    virtualNode('virtual-pass-1'),
    conditionNode('condition-b', '0.03'),
    ...wtcGroup('wtc-b', 'first_order'),
    parameterUpdateNode('parameter-update-b-main'),
    virtualNode('virtual-pass-2-main'),
    stopNode('stop'),
    parameterUpdateNode('parameter-update-b-branch'),
    virtualNode('virtual-pass-2-branch'),
  ]
  const edges = [
    edge('virtual-baseline', 'condition-a'),
    edge('condition-a', 'wtc-a-input'),
    edge('wtc-a-input', 'wtc-a-process'),
    edge('wtc-a-process', 'wtc-a-output'),
    edge('wtc-a-output', 'parameter-update-a'),
    edge('parameter-update-a', 'virtual-pass-1'),
    edge('virtual-pass-1', 'condition-b'),
    edge('condition-b', 'wtc-b-input'),
    edge('wtc-b-input', 'wtc-b-process'),
    edge('wtc-b-process', 'wtc-b-output'),
    edge('wtc-b-output', 'parameter-update-b-main'),
    edge('parameter-update-b-main', 'virtual-pass-2-main'),
    edge('virtual-pass-2-main', 'stop'),
    edge('wtc-b-output', 'parameter-update-b-branch'),
    edge('parameter-update-b-branch', 'virtual-pass-2-branch'),
  ]

  return graphApi(nodes, edges)
}

function addExperimentalBranch(graph) {
  graph.nodes.push(
    conditionNode('condition-experimental', '0.02'),
    ...wtcGroup('wtc-experimental', 'mirror'),
    parameterUpdateNode('parameter-update-experimental'),
    virtualNode('virtual-experimental'),
  )
  graph.edges.push(
    edge('condition-b', 'condition-experimental'),
    edge('condition-experimental', 'wtc-experimental-input'),
    edge('wtc-experimental-input', 'wtc-experimental-process'),
    edge('wtc-experimental-process', 'wtc-experimental-output'),
    edge('wtc-experimental-output', 'parameter-update-experimental'),
    edge('parameter-update-experimental', 'virtual-experimental'),
  )
}

function graphApi(nodes, edges) {
  return {
    edges,
    node: (id) => nodes.find((node) => node.id === id),
    nodes,
  }
}

function virtualNode(id) {
  const process = {
    axial_depth: '10',
    cutting_mode: 'down_milling',
    feed_rate: '48',
    radial_depth: '1.0',
    spindle_speed: '7200',
  }
  return {
    data: null,
    id,
    lastResponse: null,
    params: { process },
    processParameterBase: cloneValue(process),
    type: 'virtual',
  }
}

function conditionNode(id, threshold) {
  return {
    id,
    logicKind: 'condition',
    params: {
      metricPath: 'max_wall_error',
      operator: '>',
      threshold,
    },
    type: 'logic',
  }
}

function parameterUpdateNode(id) {
  return {
    id,
    logicKind: 'parameter-update',
    params: {
      sourcePath: 'compensation_plan.radial_depth_delta',
      targetPath: 'process_parameters.radial_depth',
      updateMode: 'add',
    },
    type: 'logic',
  }
}

function stopNode(id) {
  return {
    id,
    logicKind: 'stop',
    params: {
      maxIterations: '1',
      metricPath: 'max_wall_error',
      stopReason: 'closed-loop convergence check',
      tolerance: '0.01',
    },
    type: 'logic',
  }
}

function wtcGroup(groupId, method) {
  return [
    {
      groupId,
      id: `${groupId}-input`,
      processKind: 'wall-thickness-compensation',
      type: 'processInput',
    },
    {
      groupId,
      id: `${groupId}-process`,
      params: { method, radial_depth: '1.0' },
      processKind: 'wall-thickness-compensation',
      type: 'process',
    },
    {
      groupId,
      id: `${groupId}-output`,
      processKind: 'wall-thickness-compensation',
      type: 'processOutput',
    },
  ]
}

function edge(from, to) {
  return { from, to }
}

function deltaForMethod(method) {
  if (method === 'stiffness_based') return DELTA_A
  if (method === 'first_order') return DELTA_B
  if (method === 'mirror') return DELTA_MIRROR
  throw new Error(`Unknown compensation method: ${method}`)
}

function wallErrorPoints(radialDepth) {
  return [
    { error: 0.12, id: 'P1', radial_depth: radialDepth, stiffness: 266.9039146 },
    { error: 0.04, id: 'P2', radial_depth: radialDepth, stiffness: 464.8856381 },
  ]
}

function assertVirtualRadials(workflowState, expected) {
  for (const [nodeId, radialDepth] of Object.entries(expected)) {
    assert.equal(
      Number(findLatestBaseVersionForNode(workflowState, nodeId)?.parameters?.radial_depth),
      radialDepth,
      `${nodeId} radial_depth`,
    )
  }
}

function assertVirtualRuntimeViews(nodes, workflowState, expected) {
  for (const [nodeId, radialDepth] of Object.entries(expected)) {
    const node = nodes.find((item) => item.id === nodeId)
    const view = virtualNodeRuntimeParameterView(node, workflowState)
    assert.equal(Number(view?.display_parameters?.radial_depth), radialDepth, `${nodeId} display radial_depth`)
    assert.equal(Number(view?.execution_parameters?.radial_depth), radialDepth, `${nodeId} execution radial_depth`)
    assert.equal(view?.design_parameters?.radial_depth, '1.0', `${nodeId} design radial_depth remains authored base`)
  }
}

function assertAuthoredVirtualBases(nodes, expected) {
  for (const [nodeId, radialDepth] of Object.entries(expected)) {
    const node = nodes.find((item) => item.id === nodeId)
    assert.equal(node?.params?.process?.radial_depth, radialDepth, `${nodeId} params.process.radial_depth`)
    assert.equal(node?.processParameterBase?.radial_depth, radialDepth, `${nodeId} processParameterBase.radial_depth`)
  }
}

function cloneValue(value) {
  if (value == null) return value
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}
