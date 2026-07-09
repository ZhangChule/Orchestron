import { createVirtualMachiningWidget } from './virtualMachiningWidget.js'
import { CLOSED_LOOP_DEMO } from './runtime/workflowClosedLoopDemo.js'
import {
  TRIDEXEL_EXPORT_DEMO,
  createTriDexelExportDemoVirtualParams,
} from './runtime/workflowTriDexelExportDemo.js'
import { executeNode } from './runtime/workflowNodeExecutor.js'
import { createProcessParameterState } from './runtime/workflowLogicNodes.js'
import { arrangeWorkflowNodes } from './runtime/workflowLayout.js'
import {
  resolveUpstreamNodeResultOfType,
  upstreamNodeIds,
} from './runtime/workflowResultResolution.js'
import {
  DEFAULT_STIFFNESS_AVERAGE,
  DEFAULT_STIFFNESS_FILE_NAME,
  DEFAULT_STIFFNESS_FILE_PATH,
  defaultVirtualStiffnessPoints,
} from './runtime/workflowStiffnessDefaults.js'
import { averageStiffnessFromText } from './runtime/stiffnessAverage.js'
import {
  buildUnityMachiningJobPayload,
  buildUnityWallErrorFieldPayload,
} from './runtime/unityPreviewAdapter.js'
import {
  buildThicknessSemanticsForPrediction,
  normalizeCompensationWorkflowResponse,
  postprocessWallErrorPointsForDesignSurface,
  requestWithCompatibleRadialDepth,
  summarizeDesignSurfaceError,
  validateThicknessSemanticsForPrediction,
} from './runtime/virtualMachiningThicknessSemantics.js'
import {
  WORKPIECE_PRESETS,
  defaultWorkpieceParams,
  normalizeVirtualMachiningParams,
  parseToolpathText,
} from './runtime/virtualMachiningNodeConfig.js'
import {
  RUN_MODES,
  createRunStartedEvent,
  executableNodesForRunMode,
  expandedUpstreamNodeIdsForSelected,
  prepareWorkflowStateForRunMode,
} from './runtime/workflowRunModes.js'
import { addWorkflowEdge } from './runtime/workflowGraph.js'
import {
  addGeometryArtifact,
  createGeometryArtifactFromPredictionResult,
  createGeometryArtifactFromTriDexelImport,
  createGeometryArtifactEvent,
  createGeometryArtifactFromUnityResult,
  createCurrentThicknessFieldFromPredictionPoints,
  deriveCurrentThicknessFieldFromTriDexelArtifact,
  findGeometryArtifactsForNode,
  resolveGeometryArtifactForVirtualNode,
  validateGeometryArtifactForUnityPreview,
  workpieceDimensionsFromGeometryArtifact,
} from './runtime/workflowGeometryArtifacts.js'
import {
  captureVirtualProcessBase,
  virtualNodeRuntimeParameterView,
  virtualNodeWithRuntimeProcessParameters,
} from './runtime/workflowParameterBase.js'
import {
  createRunSnapshot,
  restoreRunSnapshot,
} from './runtime/workflowSnapshot.js'
import {
  appendExecutionEvent,
  createExecutionEvent,
  createInitialWorkflowState,
  exportWorkflowState,
  markNodeAndDirectDownstreamResultsStale,
  updateWorkflowState,
} from './runtime/workflowExecutionCore.js'
import {
  activateVisualizationSession,
  addVisualizationSession,
  completeVisualizationSession,
  createVisualizationSession,
  failVisualizationSession,
  findVisualizationSession,
  invalidateVisualizationSession,
  latestVisualizationSessionForNode,
  visualizationSessionDiagnostics,
} from './runtime/workflowVisualizationSessions.js'
import * as THREE from 'three'
import { OrbitControls } from './vendor/OrbitControls.js'

const translations = {
  zh: {
    'actions.addLogic': '添加逻辑节点',
    'actions.addVirtual': '添加虚拟加工',
    'actions.clearLinks': '清空连线',
    'actions.close': '关闭',
    'actions.configure': '配置节点',
    'actions.deleteNode': '删除节点',
    'actions.exportSnapshot': '导出快照',
    'actions.import': '导入文件',
    'actions.importTriDexel': '导入 TriDexel',
    'actions.importSnapshot': '导入快照',
    'actions.load': '加载工艺',
    'actions.loadClosedLoopDemo': '加载闭环 Demo',
    'actions.loadTriDexelExportDemo': '加载 TriDexel Demo',
    'actions.loadScene': '加载场景',
    'actions.loadVirtual': '加载 Unity',
    'actions.prepareScene': '准备场景',
    'actions.applyErrorCloud': '应用当前误差云图',
    'actions.startCutting': '开始切削',
    'actions.reloadUnityRuntime': '重载 Unity',
    'actions.openApp': '打开独立 App',
    'actions.resetLayout': '整理画布',
    'actions.resetScene': '重置场景',
    'actions.run': '运行流程',
    'actions.runFromSelected': '从选中节点运行',
    'actions.save': '保存配置',
    'actions.exportTriDexel': '导出 TriDexel',
    'actions.previewCutting': '预览切削过程',
    'actions.sendToVirtual': '发送到虚拟加工',
    'canvas.label': '画布',
    'catalog.help': '拖拽到画布会自动补齐输入、工艺和输出节点。',
    'catalog.label': '工艺库',
    'catalog.title': '可用工艺 App',
    'dialog.fileHint': '选择 source/target 后，平台会读取模型格式、点数、法向与包围盒，便于确认输入对象。',
    'dialog.inputTitle': '配置输入节点',
    'dialog.logicTitle': '配置逻辑节点',
    'dialog.outputTitle': '查看输出节点',
    'dialog.processTitle': '配置工艺节点',
    'dialog.virtualTitle': '配置虚拟加工节点',
    'dialog.viewDetails': '查看/编辑详细参数',
    'edge.from': '从',
    'edge.to': '到',
    'endpoint.label': '服务地址',
    'field.bbox': '包围盒',
    'field.format': '格式',
    'field.no': '无',
    'field.normals': '法向',
    'field.points': '点数',
    'field.unknown': '未知',
    'field.yes': '有',
    'files.geometry': '几何信息',
    'files.source': '源点云',
    'files.target': '目标点云',
    'files.unselected': '未选择',
    'files.stiffness': '刚度文件',
    'inspector.label': '检查器',
    'language.label': '语言',
    'logic.condition': 'condition',
    'logic.conditionMeta': '阈值判断',
    'logic.humanReview': 'human-review',
    'logic.humanReviewMeta': '人工确认点',
    'logic.parameterUpdate': 'parameter-update',
    'logic.parameterUpdateMeta': '参数更新意图',
    'logic.stop': 'stop / convergence',
    'logic.stopMeta': '迭代终止条件',
    'mode.saved': '保存记录模式',
    'mode.stateless': '无状态模式',
    'node.input': '输入',
    'node.logic': '逻辑',
    'node.logicModelOnly': '最小运行语义',
    'node.inputMeta': 'source / target',
    'node.inputName': '点云文件',
    'node.output': '输出',
    'node.outputMeta': 'matrix / xyz / angles',
    'node.outputName': '位姿结果',
    'node.process': '工艺',
    'node.processMeta': 'ARPPL register-files',
    'node.virtual': '虚拟加工',
    'node.virtualMeta': '工艺参数 -> 壁厚误差',
    'node.virtualName': '虚拟加工平台',
    'node.wtcInputMeta': '误差点',
    'node.wtcInputName': '壁厚误差',
    'node.wtcOutputMeta': '补偿方案',
    'node.wtcOutputName': '补偿结果',
    'node.wtcProcessMeta': '壁厚补偿',
    'palette.next': '后续工艺 App',
    'palette.reserved': '预留',
    'param.alpha': '鲁棒损失 alpha',
    'param.approveLabel': 'approveLabel',
    'param.axialDepth': '轴向切深',
    'param.baseHeight': '底座高度',
    'param.baseWidth': '底座宽度',
    'param.compMethod': '补偿方法',
    'param.cuttingMode': '铣削方向',
    'param.density': '密度',
    'param.diameter': '刀具直径',
    'param.elasticModulus': '弹性模量',
    'param.errorPoints': '误差点 JSON',
    'param.falseLabel': 'falseLabel',
    'param.feedRate': '进给速度',
    'param.full': '全采样',
    'param.half': '1/2 采样',
    'param.height': '高度',
    'param.helixAngle': '螺旋角',
    'param.help': '参数说明',
    'param.helpText': 'u 是 ARPPL 位移偏置；alpha 控制鲁棒损失类型；Lower/Upper tol 对应独立 App 的 lower tolerance / upper tolerance；采样比例只影响配准输入点数，默认全采样；visual pts 只影响结果可视化点数。',
    'param.immersionAngle': '浸入角',
    'param.keyPoints': '刚度测点 JSON',
    'param.length': '长度',
    'param.lowerTol': 'Lower tol',
    'param.material': '材料牌号',
    'param.maxIterations': 'maxIterations',
    'param.metricPath': 'metricPath',
    'param.modelVersion': '模型版本',
    'param.note': 'note',
    'param.operator': 'operator',
    'param.persist': '保存结果到独立 App 记录',
    'param.poissonRatio': '泊松比',
    'param.quarter': '1/4 采样',
    'param.prompt': 'prompt',
    'param.radialDepth': '径向切深',
    'param.rejectLabel': 'rejectLabel',
    'param.reviewerRole': 'reviewerRole',
    'param.sampleRatio': '配准采样比例',
    'param.sourcePath': 'sourcePath',
    'param.stopReason': 'stopReason',
    'param.spindleSpeed': '主轴转速',
    'param.targetPath': 'targetPath',
    'param.teeth': '齿数',
    'param.threshold': 'threshold',
    'param.thickness': '壁厚',
    'param.tolerance': 'tolerance',
    'param.toolLength': '刀刃长度',
    'param.toolOverall': '刀具总长',
    'param.toolType': '刀具类型',
    'param.workpiecePreview': '工件示意',
    'param.trueLabel': 'trueLabel',
    'param.upperTol': 'Upper tol',
    'param.updateMode': 'updateMode',
    'param.virtualHelpText': '虚拟加工节点加载根目录 virtual_machining_platform 中的 Unity 场景，并按节点参数生成可传递给补偿工艺的壁厚误差结果。',
    'param.visualPts': 'visual pts',
    'param.previewCutting': '壁厚误差预测完成后可预览切削过程',
    'param.wtcHelpText': 'method 控制补偿策略；radial_depth 是当前径向切深；points 可以由虚拟加工节点自动补齐，也可以手工粘贴。',
    'result.empty': '暂无结果',
    'result.matrix': '变换矩阵',
    'result.pose': '位姿',
    'result.raw': '原始输出',
    'result.record': '结果记录',
    'result.sourceTarget': '输入模型',
    'runtime.eventLog': '事件日志',
    'runtime.label': '运行快照',
    'status.connecting': '请选择目标输入端口',
    'status.done': '执行成功',
    'status.geometry': '正在读取几何',
    'status.invalidLink': '端口类型不匹配',
    'status.linkCreated': '连线已建立',
    'status.linkFilled': '参数已由连线补齐',
    'status.logicExecutionBlocked': '本阶段 LogicNode 使用最小本地运行语义。',
    'status.loading': '正在加载 manifest',
    'status.nodeAdded': '节点已添加',
    'status.nodeDeleted': '节点已删除',
    'status.noLinks': '请先连接节点',
    'status.noRunnable': '当前画布没有可运行节点',
    'status.ready': '就绪',
    'status.running': '正在运行',
    'status.saved': '配置已保存',
    'topbar.label': '公共工作流平台',
    'topbar.title': '工艺流程画布',
    'virtual.dockTitle': 'Unity 加工场景',
    'virtual.label': '虚拟加工平台',
    'virtual.statusIdle': 'Unity 未加载',
    'virtual.controlHelp': '选择一个虚拟加工节点：准备场景会加载当前几何，应用误差云图会显示该 VM 的设计面误差，开始切削会执行材料去除；重复 Unity runtime 报错后请重载。',
    'virtual.tabGeometry': '工件/材料',
    'virtual.tabProcess': '工艺',
    'virtual.tabStiffness': '刚度',
    'virtual.tabTool': '刀具',
  },
  en: {
    'actions.addLogic': 'Add Logic Node',
    'actions.addVirtual': 'Add Virtual Node',
    'actions.clearLinks': 'Clear Links',
    'actions.close': 'Close',
    'actions.configure': 'Configure Node',
    'actions.deleteNode': 'Delete Node',
    'actions.exportSnapshot': 'Export Snapshot',
    'actions.import': 'Import File',
    'actions.importTriDexel': 'Import TriDexel',
    'actions.importSnapshot': 'Import Snapshot',
    'actions.load': 'Load Process',
    'actions.loadClosedLoopDemo': 'Load Closed-loop Demo',
    'actions.loadTriDexelExportDemo': 'Load TriDexel Demo',
    'actions.loadScene': 'Load Scene',
    'actions.loadVirtual': 'Load Unity',
    'actions.prepareScene': 'Prepare Scene',
    'actions.applyErrorCloud': 'Apply Error Cloud',
    'actions.startCutting': 'Start Cutting',
    'actions.reloadUnityRuntime': 'Reload Runtime',
    'actions.openApp': 'Open App',
    'actions.resetLayout': 'Arrange',
    'actions.resetScene': 'Reset Scene',
    'actions.run': 'Run Workflow',
    'actions.runFromSelected': 'Run From Selected',
    'actions.save': 'Save',
    'actions.exportTriDexel': 'Export TriDexel',
    'actions.previewCutting': 'Preview Cutting',
    'actions.sendToVirtual': 'Preview Result',
    'canvas.label': 'Canvas',
    'catalog.help': 'Drag an app onto the canvas to add its input, process, and output nodes.',
    'catalog.label': 'Catalog',
    'catalog.title': 'Process Apps',
    'dialog.fileHint': 'After selecting source/target, the platform reads format, point count, normals, and bounding box so the input can be checked.',
    'dialog.inputTitle': 'Configure Input Node',
    'dialog.logicTitle': 'Configure Logic Node',
    'dialog.outputTitle': 'Inspect Output Node',
    'dialog.processTitle': 'Configure Process Node',
    'dialog.virtualTitle': 'Configure Virtual Machining Node',
    'dialog.viewDetails': 'View / edit details',
    'edge.from': 'From',
    'edge.to': 'To',
    'endpoint.label': 'API Base',
    'field.bbox': 'Bounding Box',
    'field.format': 'Format',
    'field.no': 'No',
    'field.normals': 'Normals',
    'field.points': 'Points',
    'field.unknown': 'Unknown',
    'field.yes': 'Yes',
    'files.geometry': 'Geometry',
    'files.source': 'Source Cloud',
    'files.target': 'Target Cloud',
    'files.unselected': 'Not Selected',
    'files.stiffness': 'Stiffness File',
    'inspector.label': 'Inspector',
    'language.label': 'Language',
    'logic.condition': 'condition',
    'logic.conditionMeta': 'threshold branch',
    'logic.humanReview': 'human-review',
    'logic.humanReviewMeta': 'human checkpoint',
    'logic.parameterUpdate': 'parameter-update',
    'logic.parameterUpdateMeta': 'parameter intent',
    'logic.stop': 'stop / convergence',
    'logic.stopMeta': 'iteration guard',
    'mode.saved': 'Saved Record Mode',
    'mode.stateless': 'Stateless Mode',
    'node.input': 'Input',
    'node.logic': 'Logic',
    'node.logicModelOnly': 'minimal runtime',
    'node.inputMeta': 'source / target',
    'node.inputName': 'Point Cloud Files',
    'node.output': 'Output',
    'node.outputMeta': 'matrix / xyz / angles',
    'node.outputName': 'Pose Result',
    'node.process': 'Process',
    'node.processMeta': 'ARPPL register-files',
    'node.virtual': 'Virtual Machining',
    'node.virtualMeta': 'process params -> wall error',
    'node.virtualName': 'Virtual Machining Platform',
    'node.wtcInputMeta': 'error points',
    'node.wtcInputName': 'Wall Error',
    'node.wtcOutputMeta': 'compensation plan',
    'node.wtcOutputName': 'Compensation Result',
    'node.wtcProcessMeta': 'wall compensation',
    'palette.next': 'Next Process App',
    'palette.reserved': 'Reserved',
    'param.alpha': 'Robust loss alpha',
    'param.approveLabel': 'approveLabel',
    'param.axialDepth': 'Axial Depth',
    'param.baseHeight': 'Base Height',
    'param.baseWidth': 'Base Width',
    'param.compMethod': 'Compensation Method',
    'param.cuttingMode': 'Cutting Mode',
    'param.density': 'Density',
    'param.diameter': 'Tool Diameter',
    'param.elasticModulus': 'Elastic Modulus',
    'param.errorPoints': 'Error Points JSON',
    'param.falseLabel': 'falseLabel',
    'param.feedRate': 'Feed Rate',
    'param.full': 'Full sampling',
    'param.half': '1/2 sampling',
    'param.height': 'Height',
    'param.helixAngle': 'Helix Angle',
    'param.help': 'Parameter Help',
    'param.helpText': 'u is the ARPPL displacement bias; alpha controls the robust loss; Lower/Upper tol match the standalone app tolerance fields; sampling ratio only changes registration input size and defaults to full; visual pts only changes result visualization size.',
    'param.immersionAngle': 'Immersion Angle',
    'param.keyPoints': 'Stiffness Points JSON',
    'param.length': 'Length',
    'param.lowerTol': 'Lower tol',
    'param.material': 'Material Grade',
    'param.maxIterations': 'maxIterations',
    'param.metricPath': 'metricPath',
    'param.modelVersion': 'Model Version',
    'param.note': 'note',
    'param.operator': 'operator',
    'param.persist': 'Save result to standalone app records',
    'param.poissonRatio': 'Poisson Ratio',
    'param.quarter': '1/4 sampling',
    'param.prompt': 'prompt',
    'param.radialDepth': 'Radial Depth',
    'param.rejectLabel': 'rejectLabel',
    'param.reviewerRole': 'reviewerRole',
    'param.sampleRatio': 'Registration sampling ratio',
    'param.sourcePath': 'sourcePath',
    'param.stopReason': 'stopReason',
    'param.spindleSpeed': 'Spindle Speed',
    'param.targetPath': 'targetPath',
    'param.teeth': 'Teeth',
    'param.threshold': 'threshold',
    'param.thickness': 'Wall Thickness',
    'param.tolerance': 'tolerance',
    'param.toolLength': 'Cutter Length',
    'param.toolOverall': 'Overall Length',
    'param.toolType': 'Tool Type',
    'param.workpiecePreview': 'Workpiece Preview',
    'param.trueLabel': 'trueLabel',
    'param.upperTol': 'Upper tol',
    'param.updateMode': 'updateMode',
    'param.virtualHelpText': 'The virtual machining node loads the Unity scene from the root virtual_machining_platform package and emits wall-error results for downstream compensation.',
    'param.visualPts': 'visual pts',
    'param.previewCutting': 'Cutting preview is available after wall-error prediction',
    'param.wtcHelpText': 'method selects the compensation strategy; radial_depth is the current radial cut depth; points can be filled by a virtual machining edge or pasted manually.',
    'result.empty': 'No Result',
    'result.matrix': 'Transform Matrix',
    'result.pose': 'Pose',
    'result.raw': 'Raw Output',
    'result.record': 'Result Record',
    'result.sourceTarget': 'Input Models',
    'runtime.eventLog': 'Event Log',
    'runtime.label': 'Run Snapshot',
    'status.connecting': 'Choose a target input port',
    'status.done': 'Succeeded',
    'status.geometry': 'Reading geometry',
    'status.invalidLink': 'Port types do not match',
    'status.linkCreated': 'Link created',
    'status.linkFilled': 'Parameters filled from link',
    'status.logicExecutionBlocked': 'LogicNode execution uses minimal local runtime semantics in this change.',
    'status.loading': 'Loading manifest',
    'status.demoLoaded': 'Closed-loop demo loaded',
    'status.snapshotExported': 'Snapshot exported',
    'status.snapshotImported': 'Snapshot imported',
    'status.snapshotImportFailed': 'Snapshot import failed',
    'status.nodeAdded': 'Node added',
    'status.nodeDeleted': 'Node deleted',
    'status.noLinks': 'Connect nodes first',
    'status.noRunnable': 'No runnable nodes on the canvas',
    'status.ready': 'Ready',
    'status.runBlocked': 'Run blocked',
    'status.running': 'Running',
    'status.saved': 'Configuration saved',
    'topbar.label': 'Public Workflow Platform',
    'topbar.title': 'Process Graph Canvas',
    'virtual.dockTitle': 'Unity Machining Scene',
    'virtual.label': 'Virtual Machining Platform',
    'virtual.statusIdle': 'Unity not loaded',
    'virtual.controlHelp': 'Select a Virtual Machining node. Prepare Scene loads its geometry, Apply Error Cloud shows its design-surface error field, and Start Cutting runs material removal. Reload Runtime after repeated Unity runtime warnings.',
    'virtual.tabGeometry': 'Workpiece / Material',
    'virtual.tabProcess': 'Process',
    'virtual.tabStiffness': 'Stiffness',
    'virtual.tabTool': 'Tool',
  },
}

const NODE_WIDTH = 220
const NODE_HEIGHT = 124
const NODE_MARGIN = 28
const PROCESS_GAP = 280

const MATERIAL_LIBRARY = [
  {
    density: '2.81',
    elasticModulus: '71.7',
    id: '7075-T6',
    label: '7075-T6',
    name: '7075-T6',
    poissonRatio: '0.33',
  },
]

const TOOL_LIBRARY = [
  {
    cutter_length: '10',
    diameter: '4.0',
    helix_angle: '30',
    id: 'flat_end_mill',
    imageUrl: './tool-library/flat-end-mill.png',
    immersion_angle: '90',
    label: '平底铣刀',
    overall_length: '32',
    teeth: '2',
    type: 'flat_end_mill',
  },
]

const processRegistry = [
  {
    id: 'arppl-process-a',
    kind: 'arppl',
    fallbackName: 'ARPPL point-to-plane registration',
    inputType: 'point_cloud_pair',
    outputType: 'pose',
    defaultApiBase: defaultApiBase(),
    standaloneUrl: defaultStandaloneUrl(),
    defaultParameters: {
      u: '0.001',
      alpha: '-inf',
      lower_tol: '-0.2',
      upper_tol: '20',
      max_outer: '30',
      max_inner: '6',
      sample_ratio: 'full',
      visual_sample_size: '20000',
      persistRecord: true,
    },
  },
  {
    id: 'wall-thickness-compensation',
    kind: 'wall-thickness-compensation',
    fallbackName: 'Wall thickness compensation',
    inputType: 'wall_error',
    outputType: 'compensation_plan',
    defaultApiBase: defaultWallCompensationApiBase(),
    standaloneUrl: defaultWallCompensationStandaloneUrl(),
    defaultParameters: {
      method: 'stiffness_based',
      radial_depth: '1.0',
      model_version: 'v1.0',
      reference_average_stiffness: String(DEFAULT_STIFFNESS_AVERAGE),
      milling_average_stiffness: String(DEFAULT_STIFFNESS_AVERAGE),
      reference_stiffness_file_name: DEFAULT_STIFFNESS_FILE_NAME,
      milling_stiffness_file_name: DEFAULT_STIFFNESS_FILE_NAME,
      error_points: JSON.stringify(defaultWallErrorPoints(), null, 2),
    },
  },
]

const LOGIC_NODE_DEFINITIONS = {
  condition: {
    kind: 'condition',
    nameKey: 'logic.condition',
    metaKey: 'logic.conditionMeta',
    defaultParameters: {
      metricPath: 'max_wall_error',
      operator: '>',
      threshold: '0.05',
      trueLabel: 'true',
      falseLabel: 'false',
    },
  },
  stop: {
    kind: 'stop',
    nameKey: 'logic.stop',
    metaKey: 'logic.stopMeta',
    defaultParameters: {
      metricPath: 'wall_error.summary.max',
      tolerance: '0.02',
      maxIterations: '3',
      stopReason: 'converged',
    },
  },
  'parameter-update': {
    kind: 'parameter-update',
    nameKey: 'logic.parameterUpdate',
    metaKey: 'logic.parameterUpdateMeta',
    defaultParameters: {
      sourcePath: 'compensation_plan.radial_depth_delta',
      targetPath: 'process_parameters.radial_depth',
      updateMode: 'add',
      note: '',
    },
  },
  'human-review': {
    kind: 'human-review',
    nameKey: 'logic.humanReview',
    metaKey: 'logic.humanReviewMeta',
    defaultParameters: {
      prompt: 'Review workflow result before continuing.',
      approveLabel: 'Approve',
      rejectLabel: 'Reject',
      reviewerRole: '',
    },
  },
}

const UNITY_PREVIEW_STATUS_PREFIX = 'Unity Preview Status:'

const state = {
  connectingFrom: null,
  edges: [],
  idCounter: 1,
  language: localStorage.getItem('workflow-language') || 'zh',
  lastResponse: null,
  nodes: [],
  pendingGeometryCaptureSessionId: null,
  pendingTriDexelExportDownload: false,
  previewRuntimeRefreshTimer: null,
  previewRuntimeStatus: {
    current_session_id: null,
    last_runtime_warning: null,
    node_short_label: null,
    requires_rerun_node_id: null,
    safe_to_preview: true,
    status: 'ready_for_next_preview',
    updated_at: null,
  },
  selectedNodeId: null,
  virtualMachining: null,
  virtualPreviewInFlight: false,
  workflowState: createInitialWorkflowState(),
}

let activeWorkpiecePreview = null

const elements = {
  addLogicNode: document.querySelector('#addLogicNode'),
  addVirtualNode: document.querySelector('#addVirtualNode'),
  apiBase: document.querySelector('#apiBase'),
  clearLinks: document.querySelector('#clearLinks'),
  dialogBody: document.querySelector('#dialogBody'),
  dialogFooter: document.querySelector('#dialogFooter'),
  dialogKicker: document.querySelector('#dialogKicker'),
  dialogTitle: document.querySelector('#dialogTitle'),
  eventLogCount: document.querySelector('#eventLogCount'),
  eventLogList: document.querySelector('#eventLogList'),
  exportRunSnapshot: document.querySelector('#exportRunSnapshot'),
  exportTriDexelImage: document.querySelector('#exportTriDexelImage'),
  prepareVirtualScene: document.querySelector('#prepareVirtualScene'),
  applyVirtualErrorCloud: document.querySelector('#applyVirtualErrorCloud'),
  startVirtualCutting: document.querySelector('#startVirtualCutting'),
  reloadVirtualRuntime: document.querySelector('#reloadVirtualRuntime'),
  graphCanvas: document.querySelector('#graphCanvas'),
  graphStatus: document.querySelector('#graphStatus'),
  importTriDexelArtifact: document.querySelector('#importTriDexelArtifact'),
  importRunSnapshot: document.querySelector('#importRunSnapshot'),
  inspectorContent: document.querySelector('#inspectorContent'),
  inspectorTitle: document.querySelector('#inspectorTitle'),
  languageSelect: document.querySelector('#languageSelect'),
  loadClosedLoopDemo: document.querySelector('#loadClosedLoopDemo'),
  loadTriDexelExportDemo: document.querySelector('#loadTriDexelExportDemo'),
  loadManifest: document.querySelector('#loadManifest'),
  loadVirtualMachining: document.querySelector('#loadVirtualMachining'),
  loadVirtualScene: document.querySelector('#loadVirtualScene'),
  logicNodeKind: document.querySelector('#logicNodeKind'),
  menuClearLinks: document.querySelector('#menuClearLinks'),
  menuConfigure: document.querySelector('#menuConfigure'),
  menuDeleteNode: document.querySelector('#menuDeleteNode'),
  menuOpenApp: document.querySelector('#menuOpenApp'),
  menuRun: document.querySelector('#menuRun'),
  nodeDialog: document.querySelector('#nodeDialog'),
  nodeMenu: document.querySelector('#nodeMenu'),
  openNodeConfig: document.querySelector('#openNodeConfig'),
  openStandalone: document.querySelector('#openStandalone'),
  processCatalog: document.querySelector('#processCatalog'),
  resetLayout: document.querySelector('#resetLayout'),
  resetVirtualScene: document.querySelector('#resetVirtualScene'),
  runFromSelected: document.querySelector('#runFromSelected'),
  runWorkflow: document.querySelector('#runWorkflow'),
  sendVirtualResult: document.querySelector('#sendVirtualResult'),
  snapshotImportFile: document.querySelector('#snapshotImportFile'),
  triDexelArtifactImportFile: document.querySelector('#triDexelArtifactImportFile'),
  virtualMachiningCanvas: document.querySelector('#virtualMachiningCanvas'),
  virtualMachiningLog: document.querySelector('#virtualMachiningLog'),
  virtualMachiningProgress: document.querySelector('#virtualMachiningProgress'),
  virtualMachiningStatus: document.querySelector('#virtualMachiningStatus'),
}

bootstrap()

function bootstrap() {
  elements.languageSelect.value = state.language
  state.virtualMachining = createVirtualMachiningWidget({
    canvas: elements.virtualMachiningCanvas,
    log: elements.virtualMachiningLog,
    progress: elements.virtualMachiningProgress,
    status: elements.virtualMachiningStatus,
  })
  installUnityRuntimeErrorGuard()
  installWorkflowGeometryArtifactListener()
  translate()
  renderCatalog()
  renderGraph()
  bindEvents()
  publishWorkflowRuntimeState()
  setStatus(t('status.ready'), 'ready')
}

function bindEvents() {
  elements.languageSelect.addEventListener('change', () => {
    state.language = elements.languageSelect.value
    localStorage.setItem('workflow-language', state.language)
    translate()
    renderCatalog()
    renderGraph()
    if (elements.nodeDialog.open) renderDialogContent()
  })

  elements.apiBase.addEventListener('change', saveApiBaseFromField)
  elements.loadManifest.addEventListener('click', () => void loadManifestForSelection())
  elements.runWorkflow.addEventListener('click', () => void runWorkflow(RUN_MODES.RUN_ALL))
  elements.runFromSelected?.addEventListener('click', () => void runWorkflow(RUN_MODES.RUN_FROM_SELECTED))
  elements.openStandalone.addEventListener('click', openStandaloneApp)
  elements.openNodeConfig.addEventListener('click', openNodeDialog)
  elements.clearLinks.addEventListener('click', clearLinks)
  elements.resetLayout.addEventListener('click', resetLayout)
  elements.loadClosedLoopDemo?.addEventListener('click', loadClosedLoopDemo)
  elements.loadTriDexelExportDemo?.addEventListener('click', loadTriDexelExportDemo)
  elements.exportRunSnapshot?.addEventListener('click', exportCurrentRunSnapshot)
  elements.exportTriDexelImage?.addEventListener('click', () => void exportTriDexelImageForSelectedNode())
  elements.importTriDexelArtifact?.addEventListener('click', () => elements.triDexelArtifactImportFile?.click())
  elements.triDexelArtifactImportFile?.addEventListener('change', () => void importTriDexelArtifactFromFile(elements.triDexelArtifactImportFile))
  elements.importRunSnapshot?.addEventListener('click', () => elements.snapshotImportFile?.click())
  elements.snapshotImportFile?.addEventListener('change', () => void importRunSnapshotFromFile())
  elements.addLogicNode?.addEventListener('click', () => {
    const kind = elements.logicNodeKind?.value ?? 'condition'
    addLogicNode(kind, 90 + state.nodes.length * 18, 90 + state.nodes.length * 12)
    setStatus(t('status.nodeAdded'), 'done')
  })
  elements.addVirtualNode.addEventListener('click', () => {
    addVirtualMachiningNode(90 + state.nodes.length * 18, 90 + state.nodes.length * 12)
    setStatus(t('status.nodeAdded'), 'done')
  })
  elements.loadVirtualMachining?.addEventListener('click', () => void state.virtualMachining.load())
  elements.loadVirtualScene?.addEventListener('click', () => void state.virtualMachining.loadScene())
  elements.prepareVirtualScene?.addEventListener('click', () => void prepareSelectedVirtualMachiningScene())
  elements.applyVirtualErrorCloud?.addEventListener('click', () => void applyCurrentVirtualMachiningErrorCloud())
  elements.startVirtualCutting?.addEventListener('click', () => void startSelectedVirtualCutting())
  elements.reloadVirtualRuntime?.addEventListener('click', () => void reloadVirtualMachiningRuntime())
  elements.resetVirtualScene?.addEventListener('click', () => void resetVirtualMachiningScene())
  elements.sendVirtualResult?.addEventListener('click', () => void sendLastResultToVirtualMachining())
  elements.nodeDialog.addEventListener('close', disposeActiveWorkpiecePreview)

  elements.graphCanvas.addEventListener('dragover', (event) => event.preventDefault())
  elements.graphCanvas.addEventListener('drop', handleCatalogDrop)

  elements.menuConfigure.addEventListener('click', () => {
    hideNodeMenu()
    openNodeDialog()
  })
  elements.menuRun.addEventListener('click', () => {
    hideNodeMenu()
    void runWorkflow(RUN_MODES.RUN_FROM_SELECTED)
  })
  elements.menuOpenApp.addEventListener('click', () => {
    hideNodeMenu()
    openStandaloneApp()
  })
  elements.menuClearLinks.addEventListener('click', () => {
    hideNodeMenu()
    clearLinks()
  })
  elements.menuDeleteNode.addEventListener('click', () => {
    hideNodeMenu()
    deleteSelectedNode()
  })

  document.addEventListener('click', (event) => {
    if (!elements.nodeMenu.contains(event.target)) hideNodeMenu()
  })
  window.addEventListener('resize', () => renderEdges())
}

function installUnityRuntimeErrorGuard() {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return
  const handleRecoverableUnityError = (event) => {
    const error = event?.reason ?? event?.error ?? event?.message ?? event
    const handled = state.virtualMachining?.handleRuntimeError?.(error)
    if (!handled) return
    invalidateCurrentVisualizationPreview(error)
    event?.preventDefault?.()
    event?.stopImmediatePropagation?.()
    updatePreviewRuntimeStatus({
      current_session_id: state.workflowState?.active_visualization_session_id ?? null,
      last_runtime_warning: errorMessage(error, 'Unity runtime warning recovered'),
      safe_to_preview: false,
      status: 'recovering',
    })
    setStatus(previewRuntimeStatusLabel(currentPreviewRuntimeStatus()), 'running')
  }
  window.addEventListener('error', handleRecoverableUnityError, true)
  window.addEventListener('unhandledrejection', handleRecoverableUnityError, true)
}

function isRecoverableUnityPreviewError(error) {
  const message = String(error?.message ?? error ?? '')
  return /null function|function signature mismatch|table index is out of bounds|memory access out of bounds|playerloop internal function has been called recursively|called recursively/i.test(message)
}
function invalidateCurrentVisualizationPreview(error) {
  const sessionId = state.pendingGeometryCaptureSessionId ?? state.workflowState.active_visualization_session_id
  if (!sessionId) return null
  const session = findVisualizationSession(state.workflowState, sessionId)
  if (!session?.visualization_session_id) return null
  const runtimeWarning = errorMessage(error, 'Unity runtime warning recovered')
  state.workflowState = invalidateVisualizationSession(state.workflowState, session.visualization_session_id, {
    runtime_warning: runtimeWarning,
  })
  if (state.pendingGeometryCaptureSessionId === session.visualization_session_id) {
    state.pendingGeometryCaptureSessionId = null
  }
  state.pendingTriDexelExportDownload = false
  state.virtualPreviewInFlight = false
  updatePreviewRuntimeStatus({
    current_session_id: session.visualization_session_id,
    last_runtime_warning: runtimeWarning,
    node_id: session.virtual_node_id,
    node_short_label: shortPreviewNodeLabel(session.virtual_node_id, session.node_display_label),
    requires_rerun_node_id: session.virtual_node_id,
    safe_to_preview: false,
    status: 'recovering',
  })
  recordRuntimeEvent({
    event_type: 'preview_session_invalidated',
    node_id: session.virtual_node_id,
    node_type: 'virtual',
    payload: {
      geometry_artifact_id: session.geometry_artifact_id ?? session.scene_payload?.geometry_artifact_id ?? null,
      node_display_label: session.node_display_label,
      node_result_version_id: session.node_result_version_id,
      runtime_warning: runtimeWarning,
      state_change_summary: visualizationSessionDiagnostics(session),
      visualization_session_id: session.visualization_session_id,
    },
    summary: `Unity preview session invalidated: ${session.visualization_session_id}`,
  })
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof window.CustomEvent === 'function') {
    window.dispatchEvent(new window.CustomEvent('WorkflowUnityRuntimeInvalidated', {
      detail: {
        runtime_warning: runtimeWarning,
        visualization_session_id: session.visualization_session_id,
      },
    }))
  }
  publishWorkflowRuntimeState()
  renderGraph()
  return session
}
function installWorkflowGeometryArtifactListener() {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return
  const handler = (event) => captureUnityGeometryArtifact(event?.detail ?? {})
  window.addEventListener('UnityMachiningCompleted', handler)
  window.addEventListener('UnityMaterialRemovalPreviewCompleted', handler)
}

function captureUnityGeometryArtifact(detail) {
  if (!detail?.triDexelImageBase64) return null
  const pendingSessionId = state.pendingGeometryCaptureSessionId
  const session = pendingSessionId ? findVisualizationSession(state.workflowState, pendingSessionId) : null
  if (!session?.visualization_session_id || !session.virtual_node_id || session.status === 'invalidated') {
    if (state.pendingTriDexelExportDownload) state.pendingTriDexelExportDownload = false
    if (state.pendingGeometryCaptureSessionId === pendingSessionId) state.pendingGeometryCaptureSessionId = null
    return null
  }
  state.pendingGeometryCaptureSessionId = null
  const alreadyCaptured = (state.workflowState.geometry_artifacts ?? [])
    .find((artifact) => artifact.source_visualization_session_id === session.visualization_session_id)
  if (alreadyCaptured) {
    if (state.pendingTriDexelExportDownload) {
      state.pendingTriDexelExportDownload = false
      downloadTriDexelArtifact(alreadyCaptured)
    }
    return alreadyCaptured
  }

  const sourceNode = state.nodes.find((node) => node.id === session.virtual_node_id)
  const currentThicknessField = createCurrentThicknessFieldFromPredictionPoints(sourceNode?.data?.wallErrorPoints ?? [], {
    source_node_id: session.virtual_node_id,
    source_result_version_id: session.node_result_version_id,
  })
  const artifact = createGeometryArtifactFromUnityResult(session, detail, {
    derived_fields: {
      current_thickness_field: currentThicknessField,
    },
    run_id: state.workflowState.run_id,
  })
  state.workflowState = addGeometryArtifact({
    ...state.workflowState,
    active_geometry_artifact_refs: {
      ...(state.workflowState.active_geometry_artifact_refs ?? {}),
      [session.virtual_node_id]: artifact.artifact_id,
    },
  }, artifact)
  recordRuntimeEvent(createGeometryArtifactEvent('geometry_artifact_created', {
    artifact_id: artifact.artifact_id,
    run_id: state.workflowState.run_id,
    source_node_id: artifact.source_node_id,
    source_result_version_id: artifact.source_result_version_id,
    source_visualization_session_id: artifact.source_visualization_session_id,
  }))
  publishWorkflowRuntimeState()
  renderGraph()
  if (state.pendingTriDexelExportDownload) {
    state.pendingTriDexelExportDownload = false
    downloadTriDexelArtifact(artifact)
  }
  return artifact
}

function t(key) {
  return translations[state.language]?.[key] ?? translations.en[key] ?? key
}

function translate() {
  document.documentElement.lang = state.language === 'zh' ? 'zh-CN' : 'en'
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n)
  })
}

function renderCatalog() {
  elements.processCatalog.innerHTML = ''
  processRegistry.forEach((process) => {
    const button = document.createElement('button')
    button.className = process.kind === selectedProcessKind() ? 'process-card active' : 'process-card'
    button.type = 'button'
    button.draggable = true
    button.innerHTML = `
      <span>${escapeHtml(process.id)}</span>
      <strong>${escapeHtml(process.fallbackName)}</strong>
      <small>${escapeHtml(t('catalog.help'))}</small>
    `
    button.addEventListener('dragstart', (event) => {
      event.dataTransfer?.setData('application/x-process-id', process.id)
      event.dataTransfer?.setData('text/plain', process.id)
      event.dataTransfer.effectAllowed = 'copy'
    })
    elements.processCatalog.appendChild(button)
  })

  const next = document.createElement('button')
  next.className = 'process-card ghost'
  next.type = 'button'
  next.disabled = true
  next.innerHTML = `<span>${escapeHtml(t('palette.reserved'))}</span><strong>${escapeHtml(t('palette.next'))}</strong>`
  elements.processCatalog.appendChild(next)
}

function handleCatalogDrop(event) {
  event.preventDefault()
  const processId = event.dataTransfer?.getData('application/x-process-id') || event.dataTransfer?.getData('text/plain')
  const process = processRegistry.find((item) => item.id === processId)
  if (!process) return
  const point = canvasPointFromEvent(event)
  addProcessGroup(process, point.x, point.y)
  setStatus(t('status.nodeAdded'), 'done')
}

function renderGraph() {
  const displayLabels = workflowNodeDisplayLabels()
  const activePreview = activeVisualizationSession()
  const nodesHtml = state.nodes
    .map((node) => {
      const spec = nodeSpec(node)
      const runtimeView = node.type === 'virtual' ? virtualNodeRuntimeParameterView(node, state.workflowState) : null
      const thicknessSemantics = node.type === 'virtual' ? (node.data?.thicknessSemantics ?? {}) : null
      const dataAttrs = runtimeView
        ? [
            `data-design-surface-thickness="${escapeHtml(node.params?.process?.design_surface_thickness ?? node.params?.design_surface_thickness ?? thicknessSemantics?.design_surface_thickness ?? '')}"`,
            `data-runtime-base-version="${escapeHtml(runtimeView.base_version_id ?? '')}"`,
            `data-execution-surface-thickness="${escapeHtml(thicknessSemantics?.execution_surface_thickness ?? '')}"`,
          ].join(' ')
        : ''
      const classes = [
        'node',
        `node-${node.type}`,
        state.selectedNodeId === node.id ? 'active' : '',
        state.connectingFrom === node.id ? 'connecting' : '',
        activePreview?.virtual_node_id === node.id ? 'preview-active' : '',
      ].filter(Boolean).join(' ')
      const displayLabel = displayLabels.get(node.id) ?? ''
      return `
        <article class="${classes}" data-node="${node.id}" ${dataAttrs} style="left:${node.x}px; top:${node.y}px">
          ${hasInputPort(node) ? `<button class="port port-in" type="button" data-node="${node.id}" data-port="in" aria-label="${escapeHtml(t('edge.to'))}"></button>` : ''}
          ${hasOutputPort(node) ? `<button class="port port-out" type="button" data-node="${node.id}" data-port="out" aria-label="${escapeHtml(t('edge.from'))}"></button>` : ''}
          <span><b class="node-sequence">${escapeHtml(displayLabel)}</b>${escapeHtml(spec.label)}</span>
          <strong title="${escapeHtml(spec.name)}">${escapeHtml(spec.name)}</strong>
          <small>${escapeHtml(spec.meta)}</small>
          <div class="node-tags">${spec.tags.filter(Boolean).map((tag) => `<em>${escapeHtml(tag)}</em>`).join('')}</div>
        </article>
      `
    })
    .join('')
  const emptyHtml = state.nodes.length
    ? ''
    : `
      <div class="canvas-empty">
        <strong>${escapeHtml(t('catalog.title'))}</strong>
        <span>${escapeHtml(t('catalog.help'))}</span>
      </div>
    `

  elements.graphCanvas.innerHTML = `
    <svg id="edgeLayer" class="edge-layer" aria-hidden="true">
      <defs>
        <marker id="arrowHead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z"></path>
        </marker>
      </defs>
      <g id="edgePaths"></g>
    </svg>
    ${emptyHtml}
    ${nodesHtml}
  `

  elements.graphCanvas.querySelectorAll('.node').forEach((nodeElement) => {
    const nodeId = nodeElement.dataset.node
    nodeElement.addEventListener('pointerdown', (event) => startNodeDrag(event, nodeId))
    nodeElement.addEventListener('dblclick', (event) => {
      if (event.target.closest('.port')) return
      selectNode(nodeId)
      openNodeDialog()
    })
    nodeElement.addEventListener('contextmenu', (event) => {
      event.preventDefault()
      selectNode(nodeId)
      showNodeMenu(event.clientX, event.clientY)
    })
  })

  elements.graphCanvas.querySelectorAll('.port').forEach((port) => {
    port.addEventListener('pointerdown', (event) => event.stopPropagation())
    port.addEventListener('click', (event) => {
      event.stopPropagation()
      handlePortClick(port.dataset.node, port.dataset.port)
    })
  })

  renderEdges()
  renderInspector()
  syncApiBaseField()
}

function nodeSpec(node) {
  if (isLogicNode(node)) {
    const definition = logicNodeDefinition(node.logicKind)
    return {
      label: t('node.logic'),
      meta: t(definition.metaKey),
      name: t(definition.nameKey),
      tags: [definition.kind, t('node.logicModelOnly')],
    }
  }

  if (node.type === 'virtual') {
    const points = node.data?.wallErrorPoints ?? []
    const runtimeView = virtualNodeRuntimeParameterView(node, state.workflowState)
    const designSurfaceThickness = node.params.process?.design_surface_thickness
      ?? node.params.design_surface_thickness
      ?? node.data?.thicknessSemantics?.design_surface_thickness
    const executionSurfaceThickness = node.data?.thicknessSemantics?.execution_surface_thickness
    const previewSession = latestVisualizationSessionForNode(state.workflowState, node.id)
    const activePreview = state.workflowState?.active_visualization_session_id === previewSession?.visualization_session_id
    return {
      label: t('node.virtual'),
      meta: t('node.virtualMeta'),
      name: t('node.virtualName'),
      tags: [
        node.params.model_version,
        `design t ${formatParameterValue(designSurfaceThickness, '--')} mm`,
        executionSurfaceThickness == null
          ? ''
          : `exec t ${formatParameterValue(executionSurfaceThickness)} mm`,
        previewSession ? (activePreview ? 'preview active' : 'preview ready') : '',
        `${points.length || 0} ${t('field.points')}`,
      ],
    }
  }

  const registry = processRegistryByKind(node.processKind)
  if (node.type === 'processInput') {
    if (node.processKind === 'wall-thickness-compensation') {
      const points = wallErrorPointsForInput(node)
      return {
        label: t('node.input'),
        meta: `${points.length || 0} ${t('field.points')}`,
        name: t('node.wtcInputName'),
        tags: [t('node.wtcInputMeta'), node.data?.source ? 'linked' : 'manual'],
      }
    }
    const names = [node.files?.source?.name, node.files?.target?.name].filter(Boolean)
    return {
      label: t('node.input'),
      meta: names.length ? names.join(' / ') : t('node.inputMeta'),
      name: t('node.inputName'),
      tags: [
        node.files?.source ? t('files.source') : t('files.unselected'),
        node.files?.target ? t('files.target') : t('files.unselected'),
      ],
    }
  }

  if (node.type === 'process') {
    const name = node.manifest?.name ?? registry.fallbackName
    if (node.processKind === 'wall-thickness-compensation') {
      return {
        label: t('node.process'),
        meta: t('node.wtcProcessMeta'),
        name,
        tags: [node.params.method, `${node.params.radial_depth} mm`],
      }
    }
    return {
      label: t('node.process'),
      meta: node.params.persistRecord ? t('mode.saved') : t('mode.stateless'),
      name,
      tags: [sampleRatioLabel(node.params.sample_ratio), `u=${node.params.u}`],
    }
  }

  const outputMeta = node.lastResponse?.status ?? (node.processKind === 'wall-thickness-compensation' ? t('node.wtcOutputMeta') : t('node.outputMeta'))
  return {
    label: t('node.output'),
    meta: outputMeta,
    name: node.processKind === 'wall-thickness-compensation' ? t('node.wtcOutputName') : t('node.outputName'),
    tags: [node.data ? outputTypeLabel(nodeOutputType(node)) : t('result.empty')],
  }
}

function renderEdges() {
  const svg = document.querySelector('#edgeLayer')
  const group = document.querySelector('#edgePaths')
  if (!svg || !group) return

  const rect = elements.graphCanvas.getBoundingClientRect()
  svg.setAttribute('width', String(rect.width))
  svg.setAttribute('height', String(rect.height))
  svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`)

  group.innerHTML = state.edges
    .map((edge) => {
      const start = getPortPoint(edge.from, 'out')
      const end = getPortPoint(edge.to, 'in')
      if (!start || !end) return ''
      const handle = Math.max(70, Math.abs(end.x - start.x) * 0.45)
      const d = `M ${start.x} ${start.y} C ${start.x + handle} ${start.y}, ${end.x - handle} ${end.y}, ${end.x} ${end.y}`
      return `<path class="edge-path" d="${d}" marker-end="url(#arrowHead)"></path>`
    })
    .join('')
}

function getPortPoint(nodeId, port) {
  const node = elements.graphCanvas.querySelector(`.node[data-node="${nodeId}"]`)
  if (!node) return null
  const canvasRect = elements.graphCanvas.getBoundingClientRect()
  const nodeRect = node.getBoundingClientRect()
  return {
    x: nodeRect.left - canvasRect.left + (port === 'out' ? nodeRect.width : 0),
    y: nodeRect.top - canvasRect.top + nodeRect.height / 2,
  }
}

function startNodeDrag(event, nodeId) {
  if (event.button !== 0 || event.target.closest('.port')) return
  const node = findNode(nodeId)
  if (!node) return
  event.preventDefault()
  hideNodeMenu()
  state.selectedNodeId = nodeId

  const nodeElement = event.currentTarget
  const start = {
    pointerX: event.clientX,
    pointerY: event.clientY,
    x: node.x,
    y: node.y,
  }
  let moved = false

  nodeElement.setPointerCapture?.(event.pointerId)
  nodeElement.classList.add('dragging')
  elements.graphCanvas.querySelectorAll('.node').forEach((element) => {
    element.classList.toggle('active', element.dataset.node === nodeId)
  })
  renderInspector()

  const onMove = (moveEvent) => {
    const dx = moveEvent.clientX - start.pointerX
    const dy = moveEvent.clientY - start.pointerY
    moved = moved || Math.abs(dx) > 2 || Math.abs(dy) > 2
    const maxX = Math.max(NODE_MARGIN, elements.graphCanvas.clientWidth - NODE_WIDTH - NODE_MARGIN)
    const maxY = Math.max(NODE_MARGIN, elements.graphCanvas.clientHeight - NODE_HEIGHT - NODE_MARGIN)
    node.x = clamp(start.x + dx, NODE_MARGIN, maxX)
    node.y = clamp(start.y + dy, NODE_MARGIN, maxY)
    nodeElement.style.left = `${node.x}px`
    nodeElement.style.top = `${node.y}px`
    renderEdges()
  }

  const onUp = () => {
    nodeElement.releasePointerCapture?.(event.pointerId)
    nodeElement.classList.remove('dragging')
    nodeElement.removeEventListener('pointermove', onMove)
    nodeElement.removeEventListener('pointerup', onUp)
    nodeElement.removeEventListener('pointercancel', onUp)
    if (!moved) selectNode(nodeId)
  }

  nodeElement.addEventListener('pointermove', onMove)
  nodeElement.addEventListener('pointerup', onUp)
  nodeElement.addEventListener('pointercancel', onUp)
}

function handlePortClick(nodeId, port) {
  selectNode(nodeId, { rerender: false })

  if (port === 'out') {
    state.connectingFrom = nodeId
    setStatus(`${t('edge.from')} ${nodeLabel(nodeId)}: ${t('status.connecting')}`, 'connecting')
    renderGraph()
    return
  }

  if (port === 'in' && state.connectingFrom) {
    const from = state.connectingFrom
    state.connectingFrom = null
    if (from !== nodeId && isValidEdge(from, nodeId)) {
      addEdge(from, nodeId)
      setStatus(t('status.linkCreated'), 'done')
    } else {
      setStatus(t('status.invalidLink'), 'error')
    }
    renderGraph()
  }
}

function isValidEdge(fromId, toId) {
  const from = findNode(fromId)
  const to = findNode(toId)
  if (!from || !to || from.id === to.id) return false
  if (!hasOutputPort(from) || !hasInputPort(to)) return false
  if (pathExists(to.id, from.id)) return false

  if (isLogicNode(from) || isLogicNode(to)) return true

  if (from.groupId && from.groupId === to.groupId) {
    return (from.type === 'processInput' && to.type === 'process') || (from.type === 'process' && to.type === 'processOutput')
  }

  if (to.type === 'process' || to.type === 'processOutput') return false
  return nodeInputTypes(to).includes(nodeOutputType(from))
}

function addEdge(from, to, options = {}) {
  if (state.edges.some((edge) => edge.from === from && edge.to === to)) return
  state.edges = addWorkflowEdge(state.edges, { from, to })
  markWorkflowResultsStale([from, to], 'workflow edge changed')
  const filled = applyConnectionData(from, to)
  if (!options.silent && filled) setStatus(t('status.linkFilled'), 'done')
}

function applyConnectionData(fromId, toId) {
  const from = findNode(fromId)
  const to = findNode(toId)
  const payload = outputPayloadForNode(from)
  if (!from || !to || !payload) return false

  if (to.type === 'processInput' && to.processKind === 'wall-thickness-compensation' && payload.type === 'wall_error') {
    to.data = {
      source: from.id,
      type: 'wall_error',
      wallErrorPoints: clone(payload.points ?? []),
    }
    const process = groupProcess(to.groupId)
    if (process) process.params.error_points = JSON.stringify(to.data.wallErrorPoints, null, 2)
    return true
  }

  if (to.type === 'process' && from.groupId === to.groupId) {
    if (to.processKind === 'wall-thickness-compensation' && payload.type === 'wall_error') {
      to.params.error_points = JSON.stringify(payload.points ?? [], null, 2)
      return true
    }
    return payload.type === processRegistryByKind(to.processKind).inputType
  }

  if (to.type === 'processOutput' && from.groupId === to.groupId) {
    to.data = payload
    to.lastResponse = from.lastResponse ?? null
    return true
  }

  if (to.type === 'virtual') {
    to.data = { ...(to.data ?? {}) }
    if (payload.type === 'compensation_plan') to.data.compensationPlan = payload.plan ?? payload.result
    if (payload.type === 'pose') to.data.pose = payload.result
    if (payload.type === 'process_params') to.params.process = { ...to.params.process, ...(payload.process ?? {}) }
    return true
  }

  return false
}

function propagateFromNode(nodeId, visited = new Set()) {
  if (visited.has(nodeId)) return
  visited.add(nodeId)
  state.edges.filter((edge) => edge.from === nodeId).forEach((edge) => {
    applyConnectionData(edge.from, edge.to)
    propagateFromNode(edge.to, visited)
  })
}

function clearLinks() {
  const previousEdges = clone(state.edges)
  state.edges = []
  state.connectingFrom = null
  const touchedNodes = [...new Set(previousEdges.flatMap((edge) => [edge.from, edge.to]).filter(Boolean))]
  state.workflowState = markNodeAndDirectDownstreamResultsStale(
    state.workflowState,
    touchedNodes,
    previousEdges,
    'workflow edges cleared',
  )
  publishWorkflowRuntimeState()
  renderGraph()
  setStatus(t('status.ready'), 'ready')
}

function resetLayout() {
  arrangeCanvasNodes()
  renderGraph()
}

function arrangeCanvasNodes() {
  const canvasWidth = Math.max(960, elements.graphCanvas?.clientWidth ?? window.innerWidth ?? 1440)
  state.nodes = arrangeWorkflowNodes(state.nodes, {
    canvasWidth,
    originX: 40,
    originY: 44,
    processGap: 240,
    rowGap: 136,
    unitGap: 220,
  })
  if (elements.graphCanvas) {
    elements.graphCanvas.scrollLeft = 0
    elements.graphCanvas.scrollTop = 0
  }
}

function deleteSelectedNode() {
  const selected = selectedNode()
  if (!selected) return
  const removeIds = selected.groupId
    ? state.nodes.filter((node) => node.groupId === selected.groupId).map((node) => node.id)
    : [selected.id]
  state.nodes = state.nodes.filter((node) => !removeIds.includes(node.id))
  state.edges = state.edges.filter((edge) => !removeIds.includes(edge.from) && !removeIds.includes(edge.to))
  state.selectedNodeId = state.nodes[0]?.id ?? null
  renderGraph()
  setStatus(t('status.nodeDeleted'), 'done')
}

function selectNode(nodeId, options = { rerender: true }) {
  state.selectedNodeId = findNode(nodeId)?.id ?? state.nodes[0]?.id ?? null
  if (options.rerender !== false) renderGraph()
  else {
    renderInspector()
    syncApiBaseField()
  }
  renderSelectedVirtualPreviewRuntimeStatus()
}

function renderInspector() {
  const node = selectedNode()
  if (!node) {
    elements.inspectorTitle.textContent = t('inspector.label')
    elements.inspectorContent.innerHTML = `<p class="muted">${escapeHtml(t('result.empty'))}</p>`
    return
  }

  elements.inspectorTitle.textContent = nodeLabel(node.id)
  if (isLogicNode(node)) elements.inspectorContent.innerHTML = logicInspectorHtml(node)
  else if (node.type === 'virtual') elements.inspectorContent.innerHTML = virtualInspectorHtml(node)
  else if (node.type === 'processInput') elements.inspectorContent.innerHTML = inputInspectorHtml(node)
  else if (node.type === 'process') elements.inspectorContent.innerHTML = processInspectorHtml(node)
  else elements.inspectorContent.innerHTML = outputInspectorHtml(node)
  bindInspectorActions()
}

function logicInspectorHtml(node) {
  const definition = logicNodeDefinition(node.logicKind)
  const rows = Object.entries(node.params ?? {})
    .map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd>`)
    .join('')
  return `
    <section class="inspector-section">
      <h2>${escapeHtml(t(definition.nameKey))}</h2>
      <p class="muted">${escapeHtml(t('status.logicExecutionBlocked'))}</p>
      <dl class="kv-list">${rows}</dl>
      <div class="button-row">
        <button type="button" data-action="configure">${escapeHtml(t('actions.configure'))}</button>
      </div>
    </section>
  `
}

function virtualInspectorHtml(node) {
  const points = node.data?.wallErrorPoints ?? []
  const wallErrorReady = points.some((point) => Number.isFinite(Number(point.error)))
  const runtimeView = virtualNodeRuntimeParameterView(node, state.workflowState)
  const sourcePatchIds = runtimeView?.source_patch_ids ?? []
  const previewSession = latestVisualizationSessionForNode(state.workflowState, node.id)
  const activePreview = state.workflowState?.active_visualization_session_id === previewSession?.visualization_session_id
  const thicknessSemantics = node.data?.thicknessSemantics ?? {}
  const designSurfaceThickness = node.params.process?.design_surface_thickness
    ?? node.params.design_surface_thickness
    ?? thicknessSemantics.design_surface_thickness
  const executionSurfaceThickness = thicknessSemantics.execution_surface_thickness
  const geometryResolution = resolveGeometryArtifactForVirtualNode(state.workflowState, node)
  const outputArtifactId = state.workflowState.active_geometry_artifact_refs?.[node.id] ?? null
  return `
    <section class="inspector-section">
      <h2>${escapeHtml(t('node.virtualName'))}</h2>
      <dl class="kv-list">
        <dt>Workflow label</dt><dd>${escapeHtml(workflowNodeDisplayLabel(node))}</dd>
        <dt>Node ID</dt><dd>${escapeHtml(node.id)}</dd>
        <dt>${escapeHtml(t('param.modelVersion'))}</dt><dd>${escapeHtml(node.params.model_version)}</dd>
        <dt>${escapeHtml(t('param.material'))}</dt><dd>${escapeHtml(node.params.material.name)}</dd>
        <dt>Geometry source</dt><dd>${escapeHtml(virtualGeometrySourceText(node, geometryResolution))}</dd>
        <dt>Geometry artifact</dt><dd>${escapeHtml(outputArtifactId ?? geometryResolution.artifact?.artifact_id ?? 'not available')}</dd>
        <dt>Design surface thickness</dt><dd>${escapeHtml(formatParameterValue(designSurfaceThickness, 'not configured'))} mm</dd>
        <dt>Execution surface thickness</dt><dd>${escapeHtml(formatParameterValue(executionSurfaceThickness, 'not run yet'))}${executionSurfaceThickness == null ? '' : ' mm'}</dd>
        <dt>Current thickness field</dt><dd>${escapeHtml(fieldSummaryText(thicknessSemantics.current_thickness_field, 'current_thickness'))}</dd>
        <dt>Execution radial depth field</dt><dd>${escapeHtml(fieldSummaryText(thicknessSemantics.execution_radial_depth_field, 'execution_radial_depth'))}</dd>
        <dt>Runtime base</dt><dd>${escapeHtml(runtimeView?.base_version_id ?? 'not run yet')}</dd>
        <dt>Source patches</dt><dd>${escapeHtml(sourcePatchIds.length ? sourcePatchIds.join(', ') : 'none')}</dd>
        <dt>Preview session</dt><dd>${escapeHtml(previewSession ? `${previewSession.visualization_session_id} (${activePreview ? 'active' : previewSession.status})` : 'not ready')}</dd>
        <dt>Preview source</dt><dd>${escapeHtml(previewSession ? visualizationSessionDiagnostics(previewSession) : 'not ready')}</dd>
        <dt>${escapeHtml(t('files.stiffness'))}</dt><dd>${escapeHtml(node.params.stiffness_file_name || t('files.unselected'))}</dd>
        <dt>${escapeHtml(t('field.points'))}</dt><dd>${escapeHtml(points.length)}</dd>
      </dl>
      <div class="button-row">
        <button type="button" data-action="configure">${escapeHtml(t('actions.configure'))}</button>
        <button class="secondary" type="button" data-action="run">${escapeHtml(t('actions.run'))}</button>
        <button class="secondary" type="button" data-action="previewCutting" ${wallErrorReady ? '' : 'disabled'}>${escapeHtml(t('actions.previewCutting'))}</button>
      </div>
      ${wallErrorReady ? '' : `<p class="muted">${escapeHtml(t('param.previewCutting'))}</p>`}
    </section>
  `
}

function virtualGeometrySourceText(node, resolution) {
  const source = node.params?.workpiece_source ?? {}
  if (source.mode === 'file') {
    if (resolution?.ok && resolution.artifact) return `file ${source.file_name ?? source.geometry_artifact_id ?? 'artifact'} / ${resolution.artifact.artifact_id}`
    return `file ${source.file_name ?? 'not selected'} / ${resolution?.error_code ?? 'not resolved'}`
  }
  if ((source.mode ?? 'parametric') === 'upstream_node') {
    const upstream = source.upstream_virtual_node_id ?? 'not selected'
    if (resolution?.ok && resolution.artifact) return `upstream ${upstream} / ${resolution.artifact.artifact_id}`
    return `upstream ${upstream} / ${resolution?.error_code ?? 'not resolved'}`
  }
  if (source.mode === 'file') return `file ${source.file_name ?? 'not selected'}`
  return 'parametric'
}

function geometryArtifactOptionsHtml(selectedArtifactId = '') {
  const artifacts = state.workflowState.geometry_artifacts ?? []
  const options = artifacts
    .filter((artifact) => artifact.artifact_type === 'tridexel_image')
    .map((artifact) => {
      const label = [
        artifact.artifact_id,
        artifact.source_node_label || artifact.source_node_id,
        artifact.stale ? 'stale' : 'fresh',
      ].filter(Boolean).join(' / ')
      return `<option value="${escapeHtml(artifact.artifact_id)}" ${selectedArtifactId === artifact.artifact_id ? 'selected' : ''}>${escapeHtml(label)}</option>`
    })
    .join('')
  return `<option value="">${escapeHtml(t('files.unselected'))}</option>${options}`
}

function upstreamVirtualNodeOptionsHtml(currentNodeId, selectedNodeId = '') {
  const options = state.nodes
    .filter((candidate) => candidate.type === 'virtual' && candidate.id !== currentNodeId)
    .map((candidate) => {
      const label = `${workflowNodeDisplayLabel(candidate)} (${candidate.id})`
      return `<option value="${escapeHtml(candidate.id)}" ${selectedNodeId === candidate.id ? 'selected' : ''}>${escapeHtml(label)}</option>`
    })
    .join('')
  return `<option value="">${escapeHtml(t('files.unselected'))}</option>${options}`
}

function fieldSummaryText(field, valueKey) {
  const values = numericValuesFromField(field, valueKey)
  if (!values.length) return 'not available'
  const min = Math.min(...values)
  const max = Math.max(...values)
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  return `count ${values.length} / min ${formatNumber(min)} / max ${formatNumber(max)} / mean ${formatNumber(mean)}`
}

function numericValuesFromField(field, valueKey) {
  if (!field) return []
  if (Array.isArray(field)) {
    return field.flatMap((item) => numericValuesFromField(item, valueKey))
  }
  if (typeof field === 'object') {
    if (Array.isArray(field.values)) return numericValuesFromField(field.values, valueKey)
    if (valueKey && Number.isFinite(Number(field[valueKey]))) return [Number(field[valueKey])]
    return Object.values(field).flatMap((item) => numericValuesFromField(item, valueKey))
  }
  const numericValue = Number(field)
  return Number.isFinite(numericValue) ? [numericValue] : []
}

function inputInspectorHtml(node) {
  if (node.processKind === 'wall-thickness-compensation') {
    const points = wallErrorPointsForInput(node)
    return `
      <section class="inspector-section">
        <h2>${escapeHtml(t('node.wtcInputName'))}</h2>
        <dl class="kv-list">
          <dt>${escapeHtml(t('field.points'))}</dt><dd>${escapeHtml(points.length)}</dd>
          <dt>${escapeHtml(t('param.errorPoints'))}</dt><dd>${escapeHtml(pointsPreviewText(points))}</dd>
          <dt>${escapeHtml(t('field.bbox'))}</dt><dd>${escapeHtml(formatBounds(boundsFromErrorPoints(points)))}</dd>
        </dl>
        <button type="button" data-action="configure">${escapeHtml(t('actions.configure'))}</button>
      </section>
    `
  }

  return `
    <section class="inspector-section">
      <h2>${escapeHtml(t('result.sourceTarget'))}</h2>
      ${fileBlockHtml('source', node.files?.source, node.geometry?.source)}
      ${fileBlockHtml('target', node.files?.target, node.geometry?.target)}
      <dl class="kv-list">
        <dt>${escapeHtml(t('param.visualPts'))}</dt><dd>${escapeHtml(groupProcess(node.groupId)?.params.visual_sample_size ?? '20000')}</dd>
      </dl>
      <button type="button" data-action="configure">${escapeHtml(t('actions.configure'))}</button>
    </section>
  `
}

function processInspectorHtml(node) {
  if (node.processKind === 'wall-thickness-compensation') {
    return `
      <section class="inspector-section">
        <h2>${escapeHtml(node.manifest?.name ?? processRegistryByKind(node.processKind).fallbackName)}</h2>
        <dl class="kv-list">
          <dt>${escapeHtml(t('param.compMethod'))}</dt><dd>${escapeHtml(node.params.method)}</dd>
          <dt>${escapeHtml(t('param.radialDepth'))}</dt><dd>${escapeHtml(node.params.radial_depth)} mm</dd>
          <dt>${escapeHtml(t('param.modelVersion'))}</dt><dd>${escapeHtml(node.params.model_version)}</dd>
          <dt>reference_average_stiffness</dt><dd>${escapeHtml(formatParameterValue(node.params.reference_average_stiffness))}</dd>
          <dt>milling_average_stiffness</dt><dd>${escapeHtml(formatParameterValue(node.params.milling_average_stiffness))}</dd>
        </dl>
        <div class="button-row">
          <button type="button" data-action="configure">${escapeHtml(t('actions.configure'))}</button>
          <button class="secondary" type="button" data-action="openApp">${escapeHtml(t('actions.openApp'))}</button>
        </div>
      </section>
    `
  }

  return `
    <section class="inspector-section">
      <h2>${escapeHtml(node.manifest?.name ?? processRegistryByKind(node.processKind).fallbackName)}</h2>
      <dl class="kv-list">
        <dt>u</dt><dd>${escapeHtml(node.params.u)}</dd>
        <dt>alpha</dt><dd>${escapeHtml(node.params.alpha)}</dd>
        <dt>${escapeHtml(t('param.lowerTol'))}</dt><dd>${escapeHtml(node.params.lower_tol)}</dd>
        <dt>${escapeHtml(t('param.upperTol'))}</dt><dd>${escapeHtml(node.params.upper_tol)}</dd>
        <dt>max_outer</dt><dd>${escapeHtml(node.params.max_outer)}</dd>
        <dt>max_inner</dt><dd>${escapeHtml(node.params.max_inner)}</dd>
        <dt>${escapeHtml(t('param.sampleRatio'))}</dt><dd>${escapeHtml(sampleRatioLabel(node.params.sample_ratio))}</dd>
        <dt>registration_sample_size</dt><dd>${escapeHtml(registrationSampleSize(node))}</dd>
      </dl>
      <div class="button-row">
        <button type="button" data-action="configure">${escapeHtml(t('actions.configure'))}</button>
        <button class="secondary" type="button" data-action="openApp">${escapeHtml(t('actions.openApp'))}</button>
      </div>
    </section>
  `
}

function outputInspectorHtml(node) {
  if (!node.lastResponse && !node.data) {
    return `
      <section class="inspector-section">
        <h2>${escapeHtml(t('result.empty'))}</h2>
        <button type="button" data-action="run">${escapeHtml(t('actions.run'))}</button>
      </section>
    `
  }

  if (node.processKind === 'wall-thickness-compensation') return wallCompensationOutputInspectorHtml(node)

  const result = node.lastResponse?.result ?? node.data?.result ?? {}
  const pose = result.pose ?? poseFromTransform(result.transform)
  return `
    <section class="inspector-section">
      <h2>${escapeHtml(t('result.pose'))}</h2>
      ${poseSummaryHtml(pose)}
    </section>
    <section class="inspector-section">
      <h2>${escapeHtml(t('result.matrix'))}</h2>
      ${matrixHtml(result.transform)}
    </section>
    <section class="inspector-section">
      <h2>${escapeHtml(t('result.raw'))}</h2>
      <pre class="raw-output">${escapeHtml(JSON.stringify(node.lastResponse ?? node.data, null, 2))}</pre>
    </section>
  `
}

function wallCompensationOutputInspectorHtml(node) {
  const result = node.lastResponse?.result ?? node.data?.result ?? {}
  const plan = result.compensation_plan ?? node.data?.plan ?? {}
  return `
    <section class="inspector-section">
      <h2>${escapeHtml(t('node.wtcOutputName'))}</h2>
      <div class="metric-grid">
        <div class="metric"><span>delta</span><strong>${escapeHtml(formatNumber(result.suggestion_value))} mm</strong></div>
        <div class="metric"><span>average error</span><strong>${escapeHtml(formatNumber(result.average_error))} mm</strong></div>
        <div class="metric"><span>points</span><strong>${escapeHtml(result.point_count ?? '--')}</strong></div>
      </div>
      <dl class="kv-list">
        <dt>${escapeHtml(t('param.compMethod'))}</dt><dd>${escapeHtml(result.method ?? plan.method ?? '--')}</dd>
        <dt>contract</dt><dd>${escapeHtml(plan.contract_version ?? '1.0')}</dd>
      </dl>
      <div class="button-row">
        <button type="button" data-action="sendVirtual">${escapeHtml(t('actions.sendToVirtual'))}</button>
        <button class="secondary" type="button" data-action="openApp">${escapeHtml(t('actions.openApp'))}</button>
      </div>
    </section>
    <section class="inspector-section">
      <h2>${escapeHtml(t('result.raw'))}</h2>
      <pre class="raw-output">${escapeHtml(JSON.stringify(node.lastResponse ?? node.data, null, 2))}</pre>
    </section>
  `
}

function bindInspectorActions() {
  elements.inspectorContent.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action
      if (action === 'configure') openNodeDialog()
      if (action === 'openApp') openStandaloneApp()
      if (action === 'run') void runWorkflow()
      if (action === 'sendVirtual') void sendLastResultToVirtualMachining()
      if (action === 'previewCutting') void previewSelectedVirtualCutting()
      if (action === 'prepareScene') void prepareSelectedVirtualMachiningScene()
      if (action === 'applyErrorCloud') void applyCurrentVirtualMachiningErrorCloud()
      if (action === 'startCutting') void startSelectedVirtualCutting()
    })
  })
}

function openNodeDialog() {
  if (!selectedNode()) return
  renderDialogContent()
  elements.nodeDialog.showModal()
}

function renderDialogContent() {
  const node = selectedNode()
  if (!node) return
  disposeActiveWorkpiecePreview()
  elements.dialogKicker.textContent = node.id
  if (isLogicNode(node)) renderLogicDialog(node)
  else if (node.type === 'virtual') renderVirtualDialog(node)
  else if (node.type === 'processInput') renderInputDialog(node)
  else if (node.type === 'process') renderProcessDialog(node)
  else renderOutputDialog(node)
}

function renderLogicDialog(node) {
  const definition = logicNodeDefinition(node.logicKind)
  elements.dialogTitle.textContent = t('dialog.logicTitle')
  elements.dialogBody.className = 'dialog-body dialog-grid'
  elements.dialogBody.innerHTML = `
    <section class="dialog-params">
      <h3>${escapeHtml(t(definition.nameKey))}</h3>
      ${logicFieldsHtml(node)}
    </section>
    <section class="dialog-params">
      <details class="help-card" open>
        <summary>${escapeHtml(t('node.logicModelOnly'))}</summary>
        <p>${escapeHtml(t('status.logicExecutionBlocked'))}</p>
      </details>
    </section>
  `
  elements.dialogFooter.innerHTML = dialogSaveFooter()
  bindDialogActions()
}

function logicFieldsHtml(node) {
  if (node.logicKind === 'condition') {
    return `
      ${textField('logicMetricPath', t('param.metricPath'), node.params.metricPath)}
      ${selectField('logicOperator', t('param.operator'), node.params.operator, ['>', '>=', '<', '<=', '==', '!='])}
      ${textField('logicThreshold', t('param.threshold'), node.params.threshold)}
      ${textField('logicTrueLabel', t('param.trueLabel'), node.params.trueLabel)}
      ${textField('logicFalseLabel', t('param.falseLabel'), node.params.falseLabel)}
    `
  }
  if (node.logicKind === 'stop') {
    return `
      ${textField('logicMetricPath', t('param.metricPath'), node.params.metricPath)}
      ${textField('logicTolerance', t('param.tolerance'), node.params.tolerance)}
      ${textField('logicMaxIterations', t('param.maxIterations'), node.params.maxIterations)}
      ${textField('logicStopReason', t('param.stopReason'), node.params.stopReason)}
    `
  }
  if (node.logicKind === 'parameter-update') {
    return `
      ${textField('logicSourcePath', t('param.sourcePath'), node.params.sourcePath)}
      ${textField('logicTargetPath', t('param.targetPath'), node.params.targetPath)}
      ${selectField('logicUpdateMode', t('param.updateMode'), node.params.updateMode, ['replace', 'add', 'scale'])}
      ${textAreaField('logicNote', t('param.note'), node.params.note)}
    `
  }
  return `
    ${textAreaField('logicPrompt', t('param.prompt'), node.params.prompt)}
    ${textField('logicApproveLabel', t('param.approveLabel'), node.params.approveLabel)}
    ${textField('logicRejectLabel', t('param.rejectLabel'), node.params.rejectLabel)}
    ${textField('logicReviewerRole', t('param.reviewerRole'), node.params.reviewerRole)}
  `
}

function renderInputDialog(node) {
  if (node.processKind === 'wall-thickness-compensation') {
    renderWallCompensationInputDialog(node)
    return
  }

  const process = groupProcess(node.groupId)
  elements.dialogTitle.textContent = t('dialog.inputTitle')
  elements.dialogBody.className = 'dialog-body dialog-grid'
  elements.dialogBody.innerHTML = `
    <section class="file-picker">
      <label>
        <span>${escapeHtml(t('files.source'))}</span>
        <input id="dialogSourceFile" type="file" accept=".ply,.obj" />
      </label>
      <label>
        <span>${escapeHtml(t('files.target'))}</span>
        <input id="dialogTargetFile" type="file" accept=".ply,.obj" />
      </label>
      <label>
        <span>${escapeHtml(t('param.visualPts'))}</span>
        <input id="dialogVisualSampleSize" value="${escapeHtml(process?.params.visual_sample_size ?? '20000')}" inputmode="numeric" />
      </label>
      <p>${escapeHtml(t('dialog.fileHint'))}</p>
    </section>
    <section class="file-picker">
      <div class="geometry-grid geometry-grid--stacked">
        <div>
          <span>${escapeHtml(t('files.source'))}</span>
          ${fileBlockHtml('source', node.files?.source, node.geometry?.source)}
        </div>
        <div>
          <span>${escapeHtml(t('files.target'))}</span>
          ${fileBlockHtml('target', node.files?.target, node.geometry?.target)}
        </div>
      </div>
    </section>
  `
  elements.dialogFooter.innerHTML = dialogSaveFooter()
  bindDialogActions()
  document.querySelector('#dialogSourceFile').addEventListener('change', (event) => void handleFileSelection(node.id, 'source', event.currentTarget))
  document.querySelector('#dialogTargetFile').addEventListener('change', (event) => void handleFileSelection(node.id, 'target', event.currentTarget))
}

function renderWallCompensationInputDialog(node) {
  elements.dialogTitle.textContent = t('dialog.inputTitle')
  elements.dialogBody.className = 'dialog-body dialog-grid'
  const points = wallErrorPointsForInput(node)
  elements.dialogBody.innerHTML = `
    <section class="file-picker">
      <label>
        <span>${escapeHtml(t('param.errorPoints'))}</span>
        <textarea id="dialogErrorPoints" spellcheck="false">${escapeHtml(JSON.stringify(points, null, 2))}</textarea>
      </label>
      <div class="button-row">
        <button class="secondary" type="button" data-dialog-action="loadWtcSample">Load sample</button>
      </div>
      <p>${escapeHtml(t('param.wtcHelpText'))}</p>
    </section>
    <section class="file-picker">
      <article class="info-card">
        <span>${escapeHtml(t('files.geometry'))}</span>
        <strong>${escapeHtml(points.length)} ${escapeHtml(t('field.points'))}</strong>
        <dl class="kv-list">
          <dt>${escapeHtml(t('field.bbox'))}</dt><dd>${escapeHtml(formatBounds(boundsFromErrorPoints(points)))}</dd>
          <dt>error avg</dt><dd>${escapeHtml(formatNumber(average(points.map((point) => point.error))))}</dd>
          <dt>stiffness avg</dt><dd>${escapeHtml(formatNumber(average(points.map((point) => point.stiffness))))}</dd>
        </dl>
      </article>
    </section>
  `
  elements.dialogFooter.innerHTML = dialogSaveFooter()
  bindDialogActions()
}

function renderProcessDialog(node) {
  if (node.processKind === 'wall-thickness-compensation') {
    renderWallCompensationProcessDialog(node)
    return
  }

  elements.dialogTitle.textContent = t('dialog.processTitle')
  elements.dialogBody.className = 'dialog-body dialog-grid'
  elements.dialogBody.innerHTML = `
    <section class="dialog-params">
      ${textField('dialogU', 'u', node.params.u)}
      ${textField('dialogAlpha', t('param.alpha'), node.params.alpha)}
      ${textField('dialogLowerTol', t('param.lowerTol'), node.params.lower_tol)}
      ${textField('dialogUpperTol', t('param.upperTol'), node.params.upper_tol)}
      ${textField('dialogMaxOuter', 'max_outer', node.params.max_outer)}
      ${textField('dialogMaxInner', 'max_inner', node.params.max_inner)}
    </section>
    <section class="dialog-params">
      <label>
        <span>${escapeHtml(t('param.sampleRatio'))}</span>
        <select id="dialogSampleRatio">
          <option value="full" ${node.params.sample_ratio === 'full' ? 'selected' : ''}>${escapeHtml(t('param.full'))}</option>
          <option value="0.5" ${node.params.sample_ratio === '0.5' ? 'selected' : ''}>${escapeHtml(t('param.half'))}</option>
          <option value="0.25" ${node.params.sample_ratio === '0.25' ? 'selected' : ''}>${escapeHtml(t('param.quarter'))}</option>
        </select>
      </label>
      <dl class="kv-list">
        <dt>registration_sample_size</dt><dd>${escapeHtml(registrationSampleSize(node))}</dd>
      </dl>
      <label class="check-row">
        <input id="dialogPersistRecord" type="checkbox" ${node.params.persistRecord ? 'checked' : ''} />
        <span>${escapeHtml(t('param.persist'))}</span>
      </label>
      <details class="help-card">
        <summary>${escapeHtml(t('param.help'))}</summary>
        <p>${escapeHtml(t('param.helpText'))}</p>
      </details>
    </section>
  `
  elements.dialogFooter.innerHTML = dialogProcessFooter()
  bindDialogActions()
}

function renderWallCompensationProcessDialog(node) {
  elements.dialogTitle.textContent = t('dialog.processTitle')
  elements.dialogBody.className = 'dialog-body dialog-grid'
  elements.dialogBody.innerHTML = `
    <section class="dialog-params">
      <label>
        <span>${escapeHtml(t('param.compMethod'))}</span>
        <select id="dialogCompMethod">
          <option value="stiffness_based" ${node.params.method === 'stiffness_based' ? 'selected' : ''}>stiffness_based</option>
          <option value="first_order" ${node.params.method === 'first_order' ? 'selected' : ''}>first_order</option>
          <option value="mirror" ${node.params.method === 'mirror' ? 'selected' : ''}>mirror</option>
        </select>
      </label>
      ${textField('dialogRadialDepth', t('param.radialDepth'), node.params.radial_depth)}
      ${textField('dialogModelVersion', t('param.modelVersion'), node.params.model_version)}
      ${textField('dialogReferenceAverageStiffness', 'reference_average_stiffness', node.params.reference_average_stiffness)}
      <div class="button-row">
        <button class="secondary" type="button" id="dialogReferenceStiffnessImport">Read reference stiffness file</button>
        <span id="dialogReferenceStiffnessFileName">${escapeHtml(node.params.reference_stiffness_file_name || t('files.unselected'))}</span>
      </div>
      <input id="dialogReferenceStiffnessFile" type="file" accept=".txt,.csv" hidden />
      ${textField('dialogMillingAverageStiffness', 'milling_average_stiffness', node.params.milling_average_stiffness)}
      <div class="button-row">
        <button class="secondary" type="button" id="dialogMillingStiffnessImport">Read milling stiffness file</button>
        <span id="dialogMillingStiffnessFileName">${escapeHtml(node.params.milling_stiffness_file_name || t('files.unselected'))}</span>
      </div>
      <input id="dialogMillingStiffnessFile" type="file" accept=".txt,.csv" hidden />
    </section>
    <section class="dialog-params">
      <details class="help-card" open>
        <summary>${escapeHtml(t('param.help'))}</summary>
        <p>${escapeHtml(t('param.wtcHelpText'))}</p>
      </details>
    </section>
  `
  elements.dialogFooter.innerHTML = dialogProcessFooter()
  bindDialogActions()
  bindWallCompensationDialogInteractions(node)
}

function renderVirtualDialog(node) {
  elements.dialogTitle.textContent = t('dialog.virtualTitle')
  elements.dialogBody.className = 'dialog-body virtual-dialog-body'
  const dimensions = parseWorkpieceDimensionsFromParams(node.params)
  const keyPoints = parseVirtualKeyPoints(node.params.key_points)
  const selectedMaterialId = node.params.material_id || node.params.material.name
  const selectedToolId = node.params.tool_id || node.params.tool.type
  const selectedWorkpiecePresetId = node.params.workpiece_preset_id || 'default-thinwall'
  const workpieceSource = node.params.workpiece_source ?? { mode: 'parametric' }
  const workpieceSourceMode = workpieceSource.mode ?? 'parametric'
  const selectedGeometryArtifactId = workpieceSource.geometry_artifact_id ?? ''
  const selectedUpstreamVirtualNodeId = workpieceSource.upstream_virtual_node_id ?? ''
  const designSurfaceThickness = node.params.process?.design_surface_thickness
    ?? node.params.design_surface_thickness
    ?? ''
  elements.dialogBody.innerHTML = `
    <nav class="virtual-config-tabs" aria-label="virtual machining sections">
      <button class="active" type="button" data-virtual-tab="geometry">${escapeHtml(t('virtual.tabGeometry'))}</button>
      <button type="button" data-virtual-tab="tool">${escapeHtml(t('virtual.tabTool'))}</button>
      <button type="button" data-virtual-tab="process">${escapeHtml(t('virtual.tabProcess'))}</button>
      <button type="button" data-virtual-tab="stiffness">${escapeHtml(t('virtual.tabStiffness'))}</button>
    </nav>

    <section class="virtual-config-editor">
      <section class="virtual-config-panel active" data-virtual-panel="geometry">
        <div class="section-heading">
          <h3>${escapeHtml(t('virtual.tabGeometry'))}</h3>
          <span data-geometry-summary>${escapeHtml(workpieceSummaryText(dimensions ?? fallbackWorkpieceDimensions()))}</span>
        </div>
        <label>
          <span>Workpiece source</span>
          <select id="vmWorkpieceSourceMode">
            <option value="parametric" ${workpieceSourceMode === 'parametric' ? 'selected' : ''}>Parametric geometry</option>
            <option value="file" ${workpieceSourceMode === 'file' ? 'selected' : ''}>TriDexel file artifact</option>
            <option value="upstream_node" ${workpieceSourceMode === 'upstream_node' ? 'selected' : ''}>Upstream VM node</option>
          </select>
        </label>
        <div data-workpiece-source-panel="parametric" ${workpieceSourceMode === 'parametric' ? '' : 'hidden'}>
          <label>
            <span>Workpiece preset</span>
            <select id="vmWorkpiecePreset">
              ${WORKPIECE_PRESETS.map((preset) => `
                <option value="${escapeHtml(preset.id)}" ${selectedWorkpiecePresetId === preset.id ? 'selected' : ''}>${escapeHtml(preset.label)}</option>
              `).join('')}
            </select>
          </label>
          <div class="form-grid-two">
            ${textField('vmLength', `${t('param.length')} L`, node.params.workpiece.length)}
            ${textField('vmHeight', `${t('param.height')} H1`, node.params.workpiece.height)}
            ${textField('vmThickness', `${t('param.thickness')} t`, node.params.workpiece.thickness)}
            ${textField('vmBaseWidth', `${t('param.baseWidth')} W`, node.params.workpiece.base_width)}
            ${textField('vmBaseHeight', `${t('param.baseHeight')} H2`, node.params.workpiece.base_height)}
          </div>
        </div>
        <div data-workpiece-source-panel="file" ${workpieceSourceMode === 'file' ? '' : 'hidden'}>
          <label>
            <span>TriDexel artifact</span>
            <select id="vmGeometryArtifactSelect">
              ${geometryArtifactOptionsHtml(selectedGeometryArtifactId)}
            </select>
          </label>
          <div class="stiffness-import-row">
            <button class="secondary" type="button" data-dialog-action="importTriDexelArtifact">Import TriDexel artifact</button>
            <input id="vmGeometryArtifactFile" type="file" accept="application/json,.json" hidden />
            <span id="vmGeometryArtifactFileName">${escapeHtml(workpieceSource.file_name ?? t('files.unselected'))}</span>
          </div>
        </div>
        <div data-workpiece-source-panel="upstream_node" ${workpieceSourceMode === 'upstream_node' ? '' : 'hidden'}>
          <label>
            <span>Upstream VM node</span>
            <select id="vmUpstreamVirtualNode">
              ${upstreamVirtualNodeOptionsHtml(node.id, selectedUpstreamVirtualNodeId)}
            </select>
          </label>
        </div>
        <label>
          <span>${escapeHtml(t('param.material'))}</span>
          <select id="vmMaterialSelect">
            <option value="">${escapeHtml(t('files.unselected'))}</option>
            ${MATERIAL_LIBRARY.map((material) => `
              <option value="${escapeHtml(material.id)}" ${selectedMaterialId === material.id ? 'selected' : ''}>${escapeHtml(material.label)}</option>
            `).join('')}
          </select>
        </label>
        <details class="help-card">
          <summary>${escapeHtml(t('dialog.viewDetails'))}</summary>
          <div class="form-grid-two">
            ${textField('vmMaterialName', t('param.material'), node.params.material.name, 'readonly')}
            ${textField('vmElasticModulus', t('param.elasticModulus'), node.params.material.elasticModulus, 'readonly')}
            ${textField('vmPoissonRatio', t('param.poissonRatio'), node.params.material.poissonRatio, 'readonly')}
            ${textField('vmDensity', t('param.density'), node.params.material.density, 'readonly')}
          </div>
        </details>
      </section>

      <section class="virtual-config-panel" data-virtual-panel="tool">
        <div class="section-heading">
          <h3>${escapeHtml(t('virtual.tabTool'))}</h3>
          <span data-tool-summary>${escapeHtml(toolSummaryText(node.params.tool))}</span>
        </div>
        <label>
          <span>${escapeHtml(t('param.toolType'))}</span>
          <select id="vmToolSelect">
            <option value="">${escapeHtml(t('files.unselected'))}</option>
            ${TOOL_LIBRARY.map((tool) => `
              <option value="${escapeHtml(tool.id)}" ${selectedToolId === tool.id ? 'selected' : ''}>${escapeHtml(tool.label)}</option>
            `).join('')}
          </select>
        </label>
        <details class="help-card">
          <summary>${escapeHtml(t('dialog.viewDetails'))}</summary>
          <div class="form-grid-two">
            ${textField('vmToolType', t('param.toolType'), node.params.tool.type, 'readonly')}
            ${textField('vmDiameter', t('param.diameter'), node.params.tool.diameter)}
            ${textField('vmTeeth', t('param.teeth'), node.params.tool.teeth)}
            ${textField('vmHelixAngle', t('param.helixAngle'), node.params.tool.helix_angle)}
            ${textField('vmImmersionAngle', t('param.immersionAngle'), node.params.tool.immersion_angle, 'readonly')}
            ${textField('vmCutterLength', t('param.toolLength'), node.params.tool.cutter_length)}
            ${textField('vmOverallLength', t('param.toolOverall'), node.params.tool.overall_length)}
          </div>
        </details>
      </section>

      <section class="virtual-config-panel" data-virtual-panel="process">
        <div class="section-heading">
          <h3>${escapeHtml(t('virtual.tabProcess'))}</h3>
          <span data-process-summary>${escapeHtml(processSummaryText(node.params.process))}</span>
        </div>
        <div class="form-grid-two">
          ${textField('vmSpindleSpeed', t('param.spindleSpeed'), node.params.process.spindle_speed)}
          ${textField('vmFeedRate', t('param.feedRate'), node.params.process.feed_rate)}
          ${textField('vmAxialDepth', t('param.axialDepth'), node.params.process.axial_depth)}
          ${textField('vmRadialDepth', t('param.radialDepth'), node.params.process.radial_depth)}
          ${textField('vmDesignSurfaceThickness', 'Design surface thickness', designSurfaceThickness)}
        </div>
        <label>
          <span>${escapeHtml(t('param.cuttingMode'))}</span>
          <select id="vmCuttingMode">
            <option value="down_milling" ${node.params.process.cutting_mode === 'down_milling' ? 'selected' : ''}>down_milling</option>
            <option value="up_milling" ${node.params.process.cutting_mode === 'up_milling' ? 'selected' : ''}>up_milling</option>
          </select>
        </label>
        <div class="stiffness-import-row">
          <button class="secondary" type="button" data-dialog-action="importToolpath">Import toolpath</button>
          <input id="vmToolpathFile" type="file" accept=".json,.txt" />
          <span id="vmToolpathFileName">${escapeHtml(node.params.toolpath_file_name || t('files.unselected'))}</span>
        </div>
        <details class="help-card">
          <summary>Toolpath JSON</summary>
          <label>
            <span>toolpath</span>
            <textarea id="vmToolpathJson" spellcheck="false">${escapeHtml(node.params.toolpath ? JSON.stringify(node.params.toolpath, null, 2) : '')}</textarea>
          </label>
        </details>
      </section>

      <section class="virtual-config-panel" data-virtual-panel="stiffness">
        <div class="section-heading">
          <h3>${escapeHtml(t('virtual.tabStiffness'))}</h3>
          <span id="vmStiffnessPointCount">${escapeHtml(keyPoints.length)} ${escapeHtml(t('field.points'))}</span>
        </div>
        <div class="stiffness-import-row">
          <button class="secondary" type="button" data-dialog-action="importStiffness">${escapeHtml(t('actions.import'))}</button>
          <input id="vmStiffnessFile" type="file" accept=".csv,.txt" />
          <span id="vmStiffnessFileName">${escapeHtml(node.params.stiffness_file_name || t('files.unselected'))}</span>
        </div>
        <details class="help-card">
          <summary>${escapeHtml(t('dialog.viewDetails'))}</summary>
          <label>
            <span>${escapeHtml(t('param.keyPoints'))}</span>
            <textarea id="vmKeyPoints" spellcheck="false">${escapeHtml(node.params.key_points)}</textarea>
          </label>
        </details>
      </section>
    </section>

    <aside class="virtual-preview-panel">
      <article class="preview-card" data-preview-panel-for="geometry">
        <div class="preview-title">
          <span>${escapeHtml(t('param.workpiecePreview'))}</span>
          <strong data-preview-summary>${escapeHtml(workpieceSummaryText(dimensions ?? fallbackWorkpieceDimensions()))}</strong>
        </div>
        <div id="vmWorkpiecePreview" class="vm-preview-stage" aria-label="${escapeHtml(t('param.workpiecePreview'))}"></div>
      </article>
      <article class="preview-card" data-preview-panel-for="tool" hidden>
        <div class="preview-title">
          <span>${escapeHtml(t('param.toolType'))}</span>
          <strong data-tool-preview-title>${escapeHtml(toolTitleText(selectedToolId))}</strong>
        </div>
        <div class="vm-tool-stage">
          <img id="vmToolPreviewImage" class="vm-tool-image" src="${escapeHtml(toolImageUrl(selectedToolId))}" alt="${escapeHtml(toolTitleText(selectedToolId))}" />
        </div>
        <dl class="kv-list tool-preview-details" data-tool-preview-details>
          ${toolPreviewDetailsHtml(node.params.tool)}
        </dl>
      </article>
      <details class="help-card">
        <summary>${escapeHtml(t('param.help'))}</summary>
        <p>${escapeHtml(t('param.virtualHelpText'))}</p>
      </details>
    </aside>
  `
  elements.dialogFooter.innerHTML = dialogProcessFooter()
  bindDialogActions()
  bindVirtualDialogInteractions(node)
}

function renderOutputDialog(node) {
  elements.dialogTitle.textContent = t('dialog.outputTitle')
  elements.dialogBody.className = 'dialog-body output-dialog-body'
  elements.dialogBody.innerHTML = outputInspectorHtml(node)
  elements.dialogFooter.innerHTML = `
    <button class="secondary" type="button" data-dialog-action="sendVirtual">${escapeHtml(t('actions.sendToVirtual'))}</button>
    <button class="secondary" type="button" data-dialog-action="run">${escapeHtml(t('actions.run'))}</button>
    <button type="button" data-dialog-action="close">${escapeHtml(t('actions.close'))}</button>
  `
  bindDialogActions()
  bindDialogBodyActions()
}

function bindDialogActions() {
  ;[elements.dialogBody, elements.dialogFooter].forEach((root) => {
    root.querySelectorAll('[data-dialog-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.dialogAction
        try {
          if (action === 'close') elements.nodeDialog.close()
          if (action === 'openApp') openStandaloneApp()
          if (action === 'sendVirtual') void sendLastResultToVirtualMachining()
          if (action === 'run') {
            saveSelectedDialogValues()
            elements.nodeDialog.close()
            void runWorkflow()
          }
          if (action === 'loadWtcSample') {
            const node = selectedNode()
            if (node?.type === 'processInput') {
              node.data = { type: 'wall_error', wallErrorPoints: defaultWallErrorPoints(), source: 'sample' }
              const process = groupProcess(node.groupId)
              if (process) process.params.error_points = JSON.stringify(defaultWallErrorPoints(), null, 2)
            }
            renderDialogContent()
          }
          if (action === 'save') {
            saveSelectedDialogValues()
            elements.nodeDialog.close()
          }
        } catch (error) {
          setStatus(errorMessage(error, 'configuration failed'), 'error')
        }
      })
    })
  })
}

function bindDialogBodyActions() {
  elements.dialogBody.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action
      if (action === 'openApp') openStandaloneApp()
      if (action === 'sendVirtual') void sendLastResultToVirtualMachining()
      if (action === 'run') {
        elements.nodeDialog.close()
        void runWorkflow()
      }
    })
  })
}

function bindWallCompensationDialogInteractions(node) {
  bindWallCompensationStiffnessImport({
    buttonSelector: '#dialogReferenceStiffnessImport',
    fileSelector: '#dialogReferenceStiffnessFile',
    inputSelector: '#dialogReferenceAverageStiffness',
    fileNameSelector: '#dialogReferenceStiffnessFileName',
    node,
    nodeAverageKey: 'reference_average_stiffness',
    nodeFileKey: 'reference_stiffness_file_name',
  })
  bindWallCompensationStiffnessImport({
    buttonSelector: '#dialogMillingStiffnessImport',
    fileSelector: '#dialogMillingStiffnessFile',
    inputSelector: '#dialogMillingAverageStiffness',
    fileNameSelector: '#dialogMillingStiffnessFileName',
    node,
    nodeAverageKey: 'milling_average_stiffness',
    nodeFileKey: 'milling_stiffness_file_name',
  })
}

function bindWallCompensationStiffnessImport(config) {
  const button = document.querySelector(config.buttonSelector)
  const fileInput = document.querySelector(config.fileSelector)
  button?.addEventListener('click', () => fileInput?.click())
  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0]
    if (!file) return
    try {
      const averageStiffness = averageStiffnessFromText(await readTextFile(file))
      const value = formatStiffnessAverageValue(averageStiffness)
      setInputValue(config.inputSelector, value)
      const fileName = document.querySelector(config.fileNameSelector)
      if (fileName) fileName.textContent = file.name
      config.node.params[config.nodeAverageKey] = value
      config.node.params[config.nodeFileKey] = file.name
      setStatus(`stiffness average loaded: ${value}`, 'ready')
    } catch (error) {
      setStatus(errorMessage(error, 'stiffness average import failed'), 'error')
    } finally {
      fileInput.value = ''
    }
  })
}

function saveSelectedDialogValues() {
  const node = selectedNode()
  if (!node) return
  const before = staleRelevantNodeSnapshot(node)
  if (isLogicNode(node)) saveLogicDialogValues(node)
  if (node.type === 'virtual') saveVirtualDialogValues(node)
  if (node.type === 'processInput') saveInputDialogValues(node)
  if (node.type === 'process') saveProcessDialogValues(node)
  if (stableJson(before) !== stableJson(staleRelevantNodeSnapshot(node))) {
    markWorkflowResultsStale([node.id], 'node config changed')
  }
  setStatus(t('status.saved'), 'ready')
  renderGraph()
}

function saveLogicDialogValues(node) {
  if (node.logicKind === 'condition') {
    node.params = {
      ...node.params,
      falseLabel: valueFromInput('#logicFalseLabel', 'false'),
      metricPath: valueFromInput('#logicMetricPath', 'result.summary.max_abs_error'),
      operator: document.querySelector('#logicOperator')?.value ?? '>',
      threshold: valueFromInput('#logicThreshold', '0.05'),
      trueLabel: valueFromInput('#logicTrueLabel', 'true'),
    }
    return
  }
  if (node.logicKind === 'stop') {
    node.params = {
      ...node.params,
      maxIterations: valueFromInput('#logicMaxIterations', '3'),
      metricPath: valueFromInput('#logicMetricPath', 'wall_error.summary.max'),
      stopReason: valueFromInput('#logicStopReason', 'converged'),
      tolerance: valueFromInput('#logicTolerance', '0.02'),
    }
    return
  }
  if (node.logicKind === 'parameter-update') {
    node.params = {
      ...node.params,
      note: valueFromInput('#logicNote', ''),
      sourcePath: valueFromInput('#logicSourcePath', 'compensation_plan.radial_depth_delta'),
      targetPath: valueFromInput('#logicTargetPath', 'process_parameters.radial_depth'),
      updateMode: document.querySelector('#logicUpdateMode')?.value ?? 'add',
    }
    return
  }
  node.params = {
    ...node.params,
    approveLabel: valueFromInput('#logicApproveLabel', 'Approve'),
    prompt: valueFromInput('#logicPrompt', 'Review workflow result before continuing.'),
    rejectLabel: valueFromInput('#logicRejectLabel', 'Reject'),
    reviewerRole: valueFromInput('#logicReviewerRole', ''),
  }
}

function saveInputDialogValues(node) {
  if (node.processKind === 'wall-thickness-compensation') {
    const value = valueFromInput('#dialogErrorPoints', JSON.stringify(defaultWallErrorPoints(), null, 2))
    const points = JSON.parse(value)
    if (!Array.isArray(points)) throw new Error('Error points JSON must be an array.')
    node.data = { type: 'wall_error', wallErrorPoints: points, source: 'manual' }
    const process = groupProcess(node.groupId)
    if (process) process.params.error_points = JSON.stringify(points, null, 2)
    propagateFromNode(node.id)
    return
  }

  const process = groupProcess(node.groupId)
  if (process) process.params.visual_sample_size = valueFromInput('#dialogVisualSampleSize', '20000')
}

function saveProcessDialogValues(node) {
  if (node.processKind === 'wall-thickness-compensation') {
    node.params = {
      ...node.params,
      method: document.querySelector('#dialogCompMethod')?.value ?? 'stiffness_based',
      model_version: valueFromInput('#dialogModelVersion', 'v1.0'),
      radial_depth: valueFromInput('#dialogRadialDepth', '1.0'),
      reference_average_stiffness: valueFromInput('#dialogReferenceAverageStiffness', ''),
      milling_average_stiffness: valueFromInput('#dialogMillingAverageStiffness', ''),
      reference_stiffness_file_name: document.querySelector('#dialogReferenceStiffnessFileName')?.textContent === t('files.unselected')
        ? ''
        : document.querySelector('#dialogReferenceStiffnessFileName')?.textContent ?? node.params.reference_stiffness_file_name ?? '',
      milling_stiffness_file_name: document.querySelector('#dialogMillingStiffnessFileName')?.textContent === t('files.unselected')
        ? ''
        : document.querySelector('#dialogMillingStiffnessFileName')?.textContent ?? node.params.milling_stiffness_file_name ?? '',
    }
    return
  }

  node.params = {
    ...node.params,
    alpha: valueFromInput('#dialogAlpha', '-inf'),
    lower_tol: valueFromInput('#dialogLowerTol', '-0.2'),
    max_inner: valueFromInput('#dialogMaxInner', '6'),
    max_outer: valueFromInput('#dialogMaxOuter', '30'),
    persistRecord: Boolean(document.querySelector('#dialogPersistRecord')?.checked),
    sample_ratio: document.querySelector('#dialogSampleRatio')?.value ?? 'full',
    u: valueFromInput('#dialogU', '0.001'),
    upper_tol: valueFromInput('#dialogUpperTol', '20'),
  }
}

function saveVirtualDialogValues(node) {
  const keyPoints = JSON.parse(valueFromInput('#vmKeyPoints', node.params.key_points))
  if (!Array.isArray(keyPoints)) throw new Error('Stiffness points JSON must be an array.')
  const toolpathText = valueFromInput('#vmToolpathJson', '')
  const toolpath = toolpathText ? parseToolpathText(toolpathText) : null
  const toolpathFileName = document.querySelector('#vmToolpathFileName')?.textContent === t('files.unselected')
    ? ''
    : document.querySelector('#vmToolpathFileName')?.textContent ?? node.params.toolpath_file_name ?? ''
  node.virtualSceneReady = false
  node.params = {
    ...node.params,
    key_points: JSON.stringify(keyPoints, null, 2),
    material_id: document.querySelector('#vmMaterialSelect')?.value ?? node.params.material_id,
    material: {
      name: valueFromInput('#vmMaterialName', '7075-T6'),
      elasticModulus: valueFromInput('#vmElasticModulus', '71.7'),
      poissonRatio: valueFromInput('#vmPoissonRatio', '0.33'),
      density: valueFromInput('#vmDensity', '2.81'),
    },
    model_version: valueFromInput('#vmModelVersion', 'v1.0'),
    process: {
      spindle_speed: valueFromInput('#vmSpindleSpeed', '7200'),
      feed_rate: valueFromInput('#vmFeedRate', '48'),
      axial_depth: valueFromInput('#vmAxialDepth', '10'),
      radial_depth: valueFromInput('#vmRadialDepth', '1.0'),
      cutting_mode: document.querySelector('#vmCuttingMode')?.value ?? 'down_milling',
      design_surface_thickness: valueFromInput(
        '#vmDesignSurfaceThickness',
        node.params.process?.design_surface_thickness ?? node.params.design_surface_thickness ?? '',
      ),
    },
    tool: {
      type: valueFromInput('#vmToolType', 'flat_end_mill'),
      diameter: valueFromInput('#vmDiameter', '4.0'),
      teeth: valueFromInput('#vmTeeth', '2'),
      helix_angle: valueFromInput('#vmHelixAngle', '30'),
      immersion_angle: valueFromInput('#vmImmersionAngle', '90'),
      cutter_length: valueFromInput('#vmCutterLength', '10'),
      overall_length: valueFromInput('#vmOverallLength', '32'),
    },
    workpiece: {
      length: valueFromInput('#vmLength', '120'),
      height: valueFromInput('#vmHeight', '56'),
      thickness: valueFromInput('#vmThickness', '3'),
      base_width: valueFromInput('#vmBaseWidth', '64'),
      base_height: valueFromInput('#vmBaseHeight', '16'),
    },
    workpiece_preset_id: document.querySelector('#vmWorkpiecePreset')?.value ?? node.params.workpiece_preset_id ?? 'default-thinwall',
    stiffness_file_name: document.querySelector('#vmStiffnessFileName')?.textContent === t('files.unselected')
      ? ''
      : document.querySelector('#vmStiffnessFileName')?.textContent ?? node.params.stiffness_file_name,
    toolpath,
    toolpath_file_name: toolpath ? toolpathFileName : '',
    tool_id: document.querySelector('#vmToolSelect')?.value ?? node.params.tool_id,
    workpiece_source: workpieceSourceFromDialog(node),
  }
  captureVirtualProcessBase(node, { overwrite: true })
}

async function loadManifestForSelection() {
  const process = selectedProcessNode()
  if (!process) {
    setStatus(t('status.ready'), 'ready')
    return
  }
  saveApiBaseFromField()
  setStatus(t('status.loading'), 'loading')
  try {
    const response = await fetch(`${normalizeApiBase(process.apiBase)}/workflow/manifest`)
    process.manifest = await parseJsonResponse(response)
    setStatus(t('status.ready'), 'ready')
  } catch (error) {
    process.manifest = null
    setStatus(errorMessage(error, 'manifest failed'), 'error')
  } finally {
    renderCatalog()
    renderGraph()
  }
}

async function runWorkflow(mode = RUN_MODES.RUN_ALL) {
  saveApiBaseFromField()
  let runnable
  try {
    runnable = runnableNodesForMode(mode)
  } catch (error) {
    recordRuntimeEvent({
      event_type: 'run_stopped',
      summary: errorMessage(error, t('status.runBlocked')),
      payload: {
        run_mode: mode,
        selected_node_id: state.selectedNodeId,
        skip_reason: errorMessage(error, t('status.runBlocked')),
        state_change_summary: `Run mode ${mode} blocked before execution`,
      },
    })
    setStatus(errorMessage(error, t('status.runBlocked')), 'error')
    publishWorkflowRuntimeState()
    return
  }
  if (!runnable.length) {
    setStatus(t('status.noRunnable'), 'error')
    return
  }

  const expandedFromNodeIds = mode === RUN_MODES.RUN_FROM_SELECTED
    ? expandedUpstreamNodeIdsForSelected(state.workflowState, state.selectedNodeId, state.nodes, state.edges)
    : []
  resetRuntimeStateForRun(mode)
  recordRuntimeEvent(createRunStartedEvent({
    expandedFromNodeIds,
    mode,
    nodeCount: runnable.length,
    selectedNodeId: mode === RUN_MODES.RUN_FROM_SELECTED ? state.selectedNodeId : null,
  }))
  setStatus(t('status.running'), 'running')
  elements.runWorkflow.disabled = true
  let halted = false
  try {
    for (const node of runnable) {
      const execution = await executeNode(node, state.workflowState, {
        edges: state.edges,
        fallback: runExistingNode,
        humanReview: requestHumanReview,
        nodes: state.nodes,
        runners: {
          arppl: runArpplNode,
          virtualMachiningWallErrorPrediction: runVirtualMachiningNodeWithRuntimeState,
          wallThicknessCompensation: runWallCompensationNodeWithRuntimeState,
        },
      })
      state.workflowState = execution.state
      if (node.type === 'virtual') registerVirtualVisualizationSession(node, execution.result)
      if (execution.result?.state_patch?.parameter_patches?.length) {
        markDirectDownstreamResultsStale(node.id, 'parameter patch list changed')
      }
      publishWorkflowRuntimeState()
      if (execution.result?.control?.halt_after_node) {
        halted = true
        if (state.workflowState.status === 'running') {
          state.workflowState = updateWorkflowState(
            state.workflowState,
            { status: 'paused' },
            `Workflow paused after ${node.id}`,
          )
          publishWorkflowRuntimeState()
        }
        setStatus(execution.result.control.reason ?? t('status.ready'), 'ready')
        break
      }
      propagateFromNode(node.id)
      const output = node.groupId ? groupOutput(node.groupId) : null
      if (output) propagateFromNode(output.id)
    }
    if (!halted && state.workflowState.status === 'running') {
      state.workflowState = updateWorkflowState(state.workflowState, { status: 'completed' }, 'Workflow status changed to completed')
      recordRuntimeEvent({
        event_type: 'run_completed',
        summary: 'Workflow run completed',
      })
      setStatus(t('status.done'), 'done')
    }
    renderGraph()
  } catch (error) {
    if (error.workflowState) {
      state.workflowState = error.workflowState
      publishWorkflowRuntimeState()
    }
    state.workflowState = updateWorkflowState(state.workflowState, { status: 'failed' }, errorMessage(error, 'workflow failed'))
    recordRuntimeEvent({
      event_type: 'run_stopped',
      summary: errorMessage(error, 'workflow failed'),
      payload: { error: errorMessage(error, 'workflow failed') },
    })
    setStatus(errorMessage(error, 'workflow failed'), 'error')
    renderGraph()
  } finally {
    publishWorkflowRuntimeState()
    elements.runWorkflow.disabled = false
  }
}

async function runExistingNode(node) {
  if (node.type === 'virtual') {
    await runVirtualMachiningNodeWithRuntimeState(node)
    return
  }
  if (node.type === 'process') await runProcessNode(node)
}

async function runVirtualMachiningNodeWithRuntimeState(node, workflowState = state.workflowState) {
  const runtimeNode = virtualNodeWithRuntimeProcessParameters(node, workflowState)
  await runVirtualMachiningNode(runtimeNode)
  node.data = clone(runtimeNode.data ?? null)
  node.lastResponse = clone(runtimeNode.lastResponse ?? null)
  node.virtualSceneReady = runtimeNode.virtualSceneReady
  state.lastResponse = node.lastResponse
}

function registerVirtualVisualizationSession(node, executionResult) {
  const result = executionResult?.result ?? node.data ?? {}
  const rawResult = executionResult?.raw_response?.result ?? node.lastResponse?.result ?? {}
  const basePayload = result.materialRemovalPreview
    ?? result.material_removal_preview
    ?? rawResult.material_removal_preview
    ?? rawResult.materialRemovalPreview
    ?? null
  if (!basePayload) return null

  const resultVersion = executionResult?.result_version ?? {}
  const nodeResultVersionId = executionResult?.result_version_id
    ?? resultVersion.node_result_version_id
    ?? null
  const payload = {
    ...clone(basePayload),
    node_display_label: workflowNodeDisplayLabel(node),
    node_result_version_id: nodeResultVersionId,
    parameter_base_version_id: resultVersion.parameter_base_version_id ?? null,
    source_node_id: node.id,
    visualization_source: {
      node_display_label: workflowNodeDisplayLabel(node),
      node_id: node.id,
      node_result_version_id: nodeResultVersionId,
    },
  }
  const session = createVisualizationSession({
    created_by: 'workflow_auto_run',
    node_display_label: workflowNodeDisplayLabel(node),
    node_result_version_id: nodeResultVersionId,
    parameter_base_version_id: resultVersion.parameter_base_version_id ?? null,
    scene_payload: result.scenePayload ?? result.scene_payload ?? rawResult.scene_payload ?? null,
    status: 'ready',
    unity_payload: payload,
    virtual_node_id: node.id,
  })

  state.workflowState = addVisualizationSession(state.workflowState, session)
  const predictionGeometryArtifact = createGeometryArtifactFromPredictionResult(session, result, {
    run_id: state.workflowState.run_id,
  })
  if (predictionGeometryArtifact.derived_fields?.current_thickness_field?.summary?.count > 0) {
    state.workflowState = addGeometryArtifact({
      ...state.workflowState,
      active_geometry_artifact_refs: {
        ...(state.workflowState.active_geometry_artifact_refs ?? {}),
        [node.id]: predictionGeometryArtifact.artifact_id,
      },
    }, predictionGeometryArtifact)
    recordRuntimeEvent(createGeometryArtifactEvent('current_thickness_field_artifact_created', {
      artifact_id: predictionGeometryArtifact.artifact_id,
      run_id: state.workflowState.run_id,
      source_node_id: node.id,
      source_result_version_id: predictionGeometryArtifact.source_result_version_id,
    }))
  }
  recordRuntimeEvent({
    event_type: 'visualization_session_created',
    node_id: node.id,
    node_type: node.type,
    payload: {
      node_display_label: session.node_display_label,
      node_result_version_id: session.node_result_version_id,
      parameter_base_version_id: session.parameter_base_version_id,
      payload_summary: session.payload_summary,
      state_change_summary: visualizationSessionDiagnostics(session),
      visualization_session_id: session.visualization_session_id,
    },
    summary: `Visualization session ready: ${session.visualization_session_id}`,
  })
  node.previewSessionId = session.visualization_session_id
  return session
}

async function runWallCompensationNodeWithRuntimeState(node) {
  applyLatestWallErrorToWallCompensationNode(node)
  await runWallCompensationNode(node)
}

function applyLatestWallErrorToWallCompensationNode(node) {
  if (node.processKind !== 'wall-thickness-compensation') return
  const upstream = resolveUpstreamNodeResultOfType(state.workflowState, 'wall_error', {
    consumerNodeId: node.id,
    edges: state.edges,
  })
  const input = groupInput(node.groupId)
  if (!upstream && upstreamNodeIds(node.id, state.edges).size) {
    node.params.error_points = '[]'
    if (input) input.data = null
    return
  }
  const wallError = upstream?.result
  const points = wallError?.wallErrorPoints ?? wallError?.points ?? wallError?.result?.points ?? []
  if (!points.length) return
  node.params.error_points = JSON.stringify(points, null, 2)
  if (input) {
    input.data = {
      source: upstream?.nodeId ? `node_results.${upstream.nodeId}` : (wallError.source ?? 'runtime-state'),
      type: 'wall_error',
      wallErrorPoints: clone(points),
    }
  }
}

function requestHumanReview({ node, prompt }) {
  if (typeof window === 'undefined' || typeof window.confirm !== 'function') return null
  const approveLabel = node.params?.approveLabel ?? 'Approve'
  const rejectLabel = node.params?.rejectLabel ?? 'Reject'
  return window.confirm(`${prompt}\n\n${approveLabel}: OK\n${rejectLabel}: Cancel`) ? 'approved' : 'rejected'
}

function resetRuntimeStateForRun(mode = RUN_MODES.RUN_ALL) {
  state.workflowState = prepareWorkflowStateForRunMode({
    currentState: state.workflowState,
    initialStateFactory: () => createInitialWorkflowState({
      initial_process_parameter_base: createProcessParameterState(state.nodes),
      node_context: Object.fromEntries(state.nodes.map((node) => [node.id, {
        logicKind: node.logicKind ?? null,
        params: clone(node.params ?? {}),
        processKind: node.processKind ?? null,
        type: node.type,
      }])),
      process_parameters: createProcessParameterState(state.nodes),
      run_mode: mode,
      status: 'running',
      workflow_id: 'workflow-platform-canvas',
      workpiece_state: currentWorkpieceStateSnapshot(),
    }),
    mode,
  })
  if (mode === RUN_MODES.RUN_FROM_SELECTED) {
    state.workflowState = {
      ...state.workflowState,
      initial_process_parameter_base: createProcessParameterState(state.nodes),
      node_context: {
        ...(state.workflowState.node_context ?? {}),
        ...Object.fromEntries(state.nodes.map((node) => [node.id, {
          logicKind: node.logicKind ?? null,
          params: clone(node.params ?? {}),
          processKind: node.processKind ?? null,
          type: node.type,
        }])),
      },
      process_parameters: {
        ...(state.workflowState.process_parameters ?? {}),
        ...createProcessParameterState(state.nodes),
      },
      run_mode: mode,
      workpiece_state: {
        ...currentWorkpieceStateSnapshot(),
        ...(state.workflowState.workpiece_state ?? {}),
      },
    }
  }
  publishWorkflowRuntimeState()
}

function recordRuntimeEvent(event) {
  try {
    state.workflowState = appendExecutionEvent(state.workflowState, createExecutionEvent({
      ...event,
      run_id: state.workflowState.run_id,
    }))
    publishWorkflowRuntimeState()
  } catch (error) {
    console.warn('Workflow runtime event recording failed', error)
  }
}

function currentWorkpieceStateSnapshot() {
  const virtualNodes = state.nodes.filter((node) => node.type === 'virtual' && node.data)
  const latest = virtualNodes[virtualNodes.length - 1]
  return latest ? { source_node_id: latest.id, result_type: latest.data?.type ?? null } : {}
}

function currentPreviewRuntimeStatus() {
  const widgetStatus = state.virtualMachining?.runtimeStatus?.() ?? {}
  const base = state.previewRuntimeStatus ?? {}
  const runtimeUnstable = widgetStatus.runtime_unstable === true || base.status === 'runtime_unstable'
  const recovering = widgetStatus.recovering === true
  const busy = state.virtualPreviewInFlight || widgetStatus.loading === true || base.status === 'busy'
  const recoveredStatus = base.status === 'recovering' && !recovering
    ? (base.requires_rerun_node_id ? 'invalidated' : 'ready_for_next_preview')
    : base.status
  const status = runtimeUnstable ? 'runtime_unstable' : (recovering ? 'recovering' : (busy ? 'busy' : (recoveredStatus ?? 'ready_for_next_preview')))
  const baseAllowsPreview = base.status === 'recovering' && !recovering ? true : base.safe_to_preview !== false
  const safeToPreview = !runtimeUnstable && !busy && !recovering && widgetStatus.safe_to_preview !== false && baseAllowsPreview
  return {
    ...base,
    status,
    safe_to_preview: safeToPreview,
    widget_runtime: widgetStatus,
    updated_at: base.updated_at ?? null,
  }
}

function updatePreviewRuntimeStatus(patch) {
  const widgetStatus = state.virtualMachining?.runtimeStatus?.() ?? {}
  state.previewRuntimeStatus = {
    ...(state.previewRuntimeStatus ?? {}),
    ...patch,
    widget_runtime: widgetStatus,
    updated_at: new Date().toISOString(),
  }
  state.workflowState = {
    ...state.workflowState,
    preview_runtime_status: currentPreviewRuntimeStatus(),
  }
  if (state.workflowState.preview_runtime_status.status === 'recovering') schedulePreviewRuntimeStatusRefresh()
}

function schedulePreviewRuntimeStatusRefresh() {
  if (typeof window === 'undefined' || typeof window.setTimeout !== 'function') return
  const runtime = state.virtualMachining?.runtimeStatus?.() ?? {}
  const delay = Math.max(0, Number(runtime.recovery_remaining_ms) || 0)
  if (delay <= 0) return
  if (state.previewRuntimeRefreshTimer != null && typeof window.clearTimeout === 'function') {
    window.clearTimeout(state.previewRuntimeRefreshTimer)
  }
  state.previewRuntimeRefreshTimer = window.setTimeout(() => {
    state.previewRuntimeRefreshTimer = null
    if (!state.virtualPreviewInFlight) {
      const widgetRuntime = state.virtualMachining?.runtimeStatus?.() ?? {}
      state.previewRuntimeStatus = {
        ...(state.previewRuntimeStatus ?? {}),
        block_reason: widgetRuntime.block_reason ?? null,
        safe_to_preview: widgetRuntime.runtime_unstable ? false : true,
        status: widgetRuntime.runtime_unstable ? 'runtime_unstable' : (state.previewRuntimeStatus?.requires_rerun_node_id ? 'invalidated' : 'ready_for_next_preview'),
        updated_at: new Date().toISOString(),
        widget_runtime: widgetRuntime,
      }
    }
    publishWorkflowRuntimeState()
  }, delay + 50)
}
function previewRuntimeStatusLabel(status = {}) {
  const label = status.node_short_label ?? shortPreviewNodeLabel(status.node_id ?? status.virtual_node_id, status.node_display_label)
  if (status.status === 'busy') return 'Unity Preview Status: Preview running: ' + label
  if (status.status === 'recovering') {
    const milliseconds = status.widget_runtime?.recovery_remaining_ms ?? status.recovery_remaining_ms ?? 0
    return 'Unity Preview Status: Recovering Unity runtime: wait ' + formatPreviewRecoverySeconds(milliseconds)
  }
  if (status.status === 'reloading') return 'Unity Preview Status: Reloading Unity runtime'
  if (status.status === 'runtime_unstable') return 'Unity Preview Status: Runtime unstable; reset Unity before next preview'
  if (status.status === 'invalidated') return 'Unity Preview Status: Preview invalidated: rerun this VM'
  return 'Unity Preview Status: Ready for next preview'
}

function renderPreviewRuntimeStatus(status = currentPreviewRuntimeStatus()) {
  const label = previewRuntimeStatusLabel(status)
  if (elements.virtualMachiningStatus) elements.virtualMachiningStatus.textContent = label
  renderVirtualDockControls(status)
}

function renderSelectedVirtualPreviewRuntimeStatus(status = currentPreviewRuntimeStatus()) {
  if (!elements.graphStatus) return
  const selected = selectedNode()
  if (!selected || selected.type !== 'virtual') {
    if (elements.graphStatus.textContent?.startsWith(UNITY_PREVIEW_STATUS_PREFIX)) {
      elements.graphStatus.textContent = t('status.ready')
    }
    renderVirtualDockControls(status)
    return
  }
  elements.graphStatus.textContent = previewRuntimeStatusLabel(status)
  renderVirtualDockControls(status)
}

function renderVirtualDockControls(status = currentPreviewRuntimeStatus()) {
  const selected = selectedNode()
  const isVirtual = selected?.type === 'virtual'
  const session = isVirtual ? latestVisualizationSessionForNode(state.workflowState, selected.id) : null
  const points = session?.unity_payload?.points ?? selected?.data?.wallErrorPoints ?? []
  const wallErrorReady = Boolean(session) && points.some((point) => Number.isFinite(Number(point.error)))
  const busy = state.virtualPreviewInFlight || status.status === 'busy'
  const runtimeUnstable = status.status === 'runtime_unstable'
  const sceneReady = Boolean(isVirtual && wallErrorReady && selected.virtualSceneReady)

  setButtonDisabled(elements.prepareVirtualScene, !isVirtual || !wallErrorReady || busy || runtimeUnstable)
  setButtonDisabled(elements.applyVirtualErrorCloud, !sceneReady || busy || runtimeUnstable)
  setButtonDisabled(elements.startVirtualCutting, !sceneReady || busy || runtimeUnstable)
  setButtonDisabled(elements.reloadVirtualRuntime, !state.virtualMachining || busy)
  setButtonDisabled(elements.resetVirtualScene, !state.virtualMachining || busy)
  setButtonDisabled(elements.exportTriDexelImage, !isVirtual || busy)
}

function setButtonDisabled(button, disabled) {
  if (button) button.disabled = Boolean(disabled)
}

function shortPreviewNodeLabel(nodeId, fallback = 'VM') {
  const match = String(nodeId ?? '').match(/virtual-machining-(\d+)/)
  if (match) return 'VM' + match[1]
  const fallbackMatch = String(fallback ?? '').match(/#?(\d+)/)
  if (fallbackMatch && /virtual/i.test(String(fallback ?? ''))) return 'VM' + fallbackMatch[1]
  return String(fallback ?? 'VM')
}

function formatPreviewRecoverySeconds(milliseconds) {
  const seconds = Math.max(0.1, Number(milliseconds) / 1000)
  return seconds.toFixed(1).replace(/\.0$/, '') + 's'
}
function publishWorkflowRuntimeState() {
  const previewRuntimeStatus = currentPreviewRuntimeStatus()
  const exported = {
    ...exportWorkflowState(state.workflowState),
    preview_runtime_status: previewRuntimeStatus,
    virtual_node_runtime_parameters: virtualNodeRuntimeParameterViews(),
  }
  if (typeof window !== 'undefined') window.workflowRuntimeState = exported
  renderPreviewRuntimeStatus(previewRuntimeStatus)
  renderSelectedVirtualPreviewRuntimeStatus(previewRuntimeStatus)
  renderEventLog(exported.event_log ?? [])
  saveLatestSnapshotToLocalStorage()
}

function virtualNodeRuntimeParameterViews() {
  return Object.fromEntries(
    state.nodes
      .filter((node) => node.type === 'virtual')
      .map((node) => [node.id, virtualNodeRuntimeParameterView(node, state.workflowState)]),
  )
}

function currentRunSnapshot() {
  return createRunSnapshot({
    appVersion: 'workflow-platform-frontend',
    edges: state.edges,
    nodes: state.nodes,
    runMode: state.workflowState?.run_mode ?? RUN_MODES.RUN_ALL,
    runtimeVersion: 'workflow-runtime-v0',
    selectedNodeId: state.selectedNodeId,
    workflowState: state.workflowState,
  })
}

function exportCurrentRunSnapshot() {
  const snapshot = currentRunSnapshot()
  const json = JSON.stringify(snapshot, null, 2)
  const filename = `${snapshot.workflow_state?.run_id ?? 'workflow-run'}-snapshot.json`
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
  setStatus(t('status.snapshotExported'), 'done')
}

async function exportTriDexelImageForSelectedNode() {
  const node = selectedNode()
  if (!node || node.type !== 'virtual') {
    setStatus('Select a Virtual Machining node before exporting TriDexel.', 'error')
    return
  }

  const latestArtifact = latestTriDexelArtifactForNode(node.id)
  if (latestArtifact?.data_base64) {
    downloadTriDexelArtifact(latestArtifact)
    setStatus(`TriDexel artifact exported: ${latestArtifact.artifact_id}`, 'done')
    return
  }

  const session = latestVisualizationSessionForNode(state.workflowState, node.id)
  if (!session?.visualization_session_id) {
    setStatus('Run wall-error prediction and Preview Cutting before exporting TriDexel.', 'error')
    return
  }

  try {
    state.workflowState = activateVisualizationSession(state.workflowState, session.visualization_session_id)
    state.pendingGeometryCaptureSessionId = session.visualization_session_id
    state.pendingTriDexelExportDownload = true
    const sent = await state.virtualMachining.exportTriDexelImage()
    if (!sent) {
      state.pendingGeometryCaptureSessionId = null
      state.pendingTriDexelExportDownload = false
      setStatus('Unity did not accept the TriDexel export request.', 'error')
      return
    }
    setStatus('TriDexel export requested; waiting for Unity completed event.', 'running')
    publishWorkflowRuntimeState()
  } catch (error) {
    state.pendingGeometryCaptureSessionId = null
    state.pendingTriDexelExportDownload = false
    setStatus(errorMessage(error, 'TriDexel export failed'), 'error')
  }
}

function latestTriDexelArtifactForNode(nodeId) {
  return findGeometryArtifactsForNode(state.workflowState, nodeId)
    .filter((artifact) => artifact.artifact_type === 'tridexel_image' && artifact.data_base64)
    .at(-1) ?? null
}

function downloadTriDexelArtifact(artifact) {
  const payload = {
    artifact_id: artifact.artifact_id,
    artifact_type: artifact.artifact_type,
    created_at: artifact.created_at,
    derived_fields: artifact.derived_fields,
    format: artifact.format,
    geometry_metadata: artifact.geometry_metadata,
    run_id: artifact.run_id,
    schema_version: 'workflow-tridexel-image-export.v0',
    source_node_id: artifact.source_node_id,
    source_node_label: artifact.source_node_label,
    source_result_version_id: artifact.source_result_version_id,
    source_visualization_session_id: artifact.source_visualization_session_id,
    summary: artifact.summary,
    triDexelImageBase64: artifact.data_base64,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${artifact.artifact_id ?? 'tridexel'}-tridexel.json`
  link.click()
  URL.revokeObjectURL(url)
}

async function importTriDexelArtifactFromFile(fileInput, options = {}) {
  const file = fileInput?.files?.[0]
  if (!file) return
  try {
    const artifact = importTriDexelArtifactPayload(JSON.parse(await file.text()), {
      fileName: file.name,
      targetNode: options.targetNode ?? selectedNode(),
    })
    setStatus(`TriDexel artifact imported: ${artifact.artifact_id}`, 'done')
  } catch (error) {
    setStatus(errorMessage(error, 'TriDexel artifact import failed'), 'error')
  } finally {
    if (fileInput) fileInput.value = ''
  }
}

function importTriDexelArtifactPayload(payload, options = {}) {
  const artifact = createGeometryArtifactFromTriDexelImport(payload, {
    file_name: options.fileName,
  })
  if (!artifact.data_base64) throw new Error('TriDexel artifact import requires triDexelImageBase64.')

  state.workflowState = addGeometryArtifact(state.workflowState, artifact)

  const targetNode = options.targetNode?.type === 'virtual' ? options.targetNode : null
  if (targetNode) {
    targetNode.params = normalizeVirtualMachiningParams({
      ...targetNode.params,
      workpiece_source: {
        file_name: options.fileName ?? artifact.data_ref?.imported_file_name ?? null,
        geometry_artifact_id: artifact.artifact_id,
        mode: 'file',
        upstream_virtual_node_id: null,
      },
    })
    state.workflowState = {
      ...state.workflowState,
      active_geometry_artifact_refs: {
        ...(state.workflowState.active_geometry_artifact_refs ?? {}),
        [targetNode.id]: artifact.artifact_id,
      },
    }
  }

  recordRuntimeEvent(createGeometryArtifactEvent('geometry_artifact_imported', {
    artifact_id: artifact.artifact_id,
    consumer_node_id: targetNode?.id ?? null,
    run_id: state.workflowState.run_id,
    source_node_id: artifact.source_node_id,
    source_result_version_id: artifact.source_result_version_id,
    source_visualization_session_id: artifact.source_visualization_session_id,
  }))
  publishWorkflowRuntimeState()
  renderGraph()
  if (elements.nodeDialog.open) renderDialogContent()
  return artifact
}

async function importRunSnapshotFromFile() {
  const file = elements.snapshotImportFile?.files?.[0]
  if (!file) return
  try {
    const restored = restoreRunSnapshot(await file.text())
    restoreRuntimeSnapshot(restored)
    setStatus(t('status.snapshotImported'), 'done')
  } catch (error) {
    setStatus(`${t('status.snapshotImportFailed')}: ${errorMessage(error, 'invalid snapshot')}`, 'error')
  } finally {
    if (elements.snapshotImportFile) elements.snapshotImportFile.value = ''
  }
}

function restoreRuntimeSnapshot(restored) {
  state.nodes = restored.nodes
  state.edges = restored.edges
  state.selectedNodeId = restored.selectedNodeId
  state.workflowState = {
    ...restored.workflowState,
    run_mode: restored.runMode ?? restored.workflowState?.run_mode ?? RUN_MODES.RESUME_FROM_SNAPSHOT,
  }
  state.connectingFrom = null
  state.nodes
    .filter((node) => node.type === 'virtual')
    .forEach((node) => {
      node.params = normalizeVirtualMachiningParams(node.params)
      captureVirtualProcessBase(node)
      node.virtualSceneReady = false
    })
  publishWorkflowRuntimeState()
  renderGraph()
}

function renderEventLog(events = []) {
  if (!elements.eventLogList || !elements.eventLogCount) return
  const archivedRuns = state.workflowState?.run_history?.length ?? 0
  elements.eventLogCount.textContent = archivedRuns
    ? `${events.length} events (${archivedRuns} archived runs)`
    : `${events.length} events`
  elements.eventLogList.innerHTML = events.length
    ? events.slice(-80).map((event) => {
      const meta = eventLogMeta(event)
      return `
      <li>
        <strong>${escapeHtml(event.event_type ?? 'event')}</strong>
        <span>${escapeHtml(event.node_id ?? '-')}</span>
        <time>${escapeHtml(event.timestamp ?? '')}</time>
        <p>${escapeHtml(event.summary ?? '')}</p>
        ${meta ? `<small>${escapeHtml(meta)}</small>` : ''}
      </li>
    `}).join('')
    : `<li class="empty-event">${escapeHtml(t('result.empty'))}</li>`
}

function eventLogMeta(event) {
  const payload = event.payload ?? {}
  const parts = []
  if (event.event_sequence) parts.push(`#${event.event_sequence}`)
  if (event.result_version_id) parts.push(`result=${event.result_version_id}`)
  if (payload.visualization_session_id) parts.push(`preview=${payload.visualization_session_id}`)
  if (payload.artifact_id) parts.push(`artifact=${payload.artifact_id}`)
  if (payload.geometry_artifact_id) parts.push(`geometry=${payload.geometry_artifact_id}`)
  if (payload.node_display_label) parts.push(`label=${payload.node_display_label}`)
  if (payload.stale !== undefined) parts.push(`stale=${payload.stale}`)
  if (payload.stale_reason) parts.push(`reason=${payload.stale_reason}`)
  if (event.skip_reason) parts.push(`skip=${event.skip_reason}`)
  if (event.base_version_after) parts.push(`base=${event.base_version_after}`)
  if (event.patch_ids?.length) parts.push(`patch=${event.patch_ids.join(',')}`)
  if (payload.input_fingerprint_summary?.block_id) parts.push(`block=${payload.input_fingerprint_summary.block_id}`)
  return parts.join(' | ')
}

function markWorkflowResultsStale(nodeIds, reason) {
  state.workflowState = markNodeAndDirectDownstreamResultsStale(
    state.workflowState,
    nodeIds,
    state.edges,
    reason,
  )
  publishWorkflowRuntimeState()
}

function markDirectDownstreamResultsStale(nodeId, reason) {
  const downstreamIds = state.edges
    .filter((edge) => edge.from === nodeId)
    .map((edge) => edge.to)
  if (!downstreamIds.length) return
  state.workflowState = markNodeAndDirectDownstreamResultsStale(
    state.workflowState,
    downstreamIds,
    [],
    reason,
  )
}

function staleRelevantNodeSnapshot(node) {
  return {
    data: clone(node.data ?? null),
    files: Object.keys(node.files ?? {}).sort().reduce((next, key) => {
      const file = node.files[key]
      next[key] = file ? { name: file.name, size: file.size, type: file.type } : null
      return next
    }, {}),
    logicKind: node.logicKind ?? null,
    params: clone(node.params ?? {}),
    processKind: node.processKind ?? null,
    type: node.type ?? null,
  }
}

function stableJson(value) {
  return JSON.stringify(sortJsonValue(value))
}

function sortJsonValue(value) {
  if (Array.isArray(value)) return value.map(sortJsonValue)
  if (!value || typeof value !== 'object') return value
  return Object.keys(value).sort().reduce((next, key) => {
    const item = value[key]
    if (item !== undefined) next[key] = sortJsonValue(item)
    return next
  }, {})
}

function saveLatestSnapshotToLocalStorage() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem('workflow-latest-run-snapshot', JSON.stringify(currentRunSnapshot()))
  } catch (error) {
    console.warn('Snapshot localStorage save failed', error)
  }
}

async function runProcessNode(node) {
  if (node.processKind === 'wall-thickness-compensation') {
    await runWallCompensationNode(node)
    return
  }
  await runArpplNode(node)
}

async function runWallCompensationNode(node) {
  const points = wallErrorPointsForProcess(node)
  if (!points.length) throw new Error('Wall error points are required.')
  const payload = {
    method: node.params.method,
    model_version: node.params.model_version,
    points,
    radial_depth: numberValue(node.params.radial_depth, 1),
  }
  if (node.params.method === 'stiffness_based') {
    const referenceAverageStiffness = numberOrNull(node.params.reference_average_stiffness)
    const millingAverageStiffness = numberOrNull(node.params.milling_average_stiffness)
    if (referenceAverageStiffness == null || millingAverageStiffness == null) {
      throw new Error('reference_average_stiffness and milling_average_stiffness are required for stiffness_based compensation.')
    }
    payload.reference_average_stiffness = referenceAverageStiffness
    payload.milling_average_stiffness = millingAverageStiffness
  }
  let body
  try {
    const response = await fetch(`${normalizeApiBase(node.apiBase)}/workflow/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        node_id: node.manifest?.id ?? 'wall-thickness-compensation',
        trace_id: `platform-${Date.now()}`,
        payload,
      }),
    })
    body = await parseJsonResponse(response)
  } catch (error) {
    body = localCompensationWorkflow(node, points, error)
  }
  body = normalizeCompensationWorkflowResponse(body)
  node.lastResponse = body
  node.data = {
    plan: body.result?.compensation_plan,
    result: body.result,
    type: 'compensation_plan',
  }
  state.lastResponse = body
}

function localCompensationWorkflow(node, points, sourceError) {
  const radialDepth = numberValue(node.params.radial_depth, 1)
  const errors = points.map((point) => Number(point.error)).filter(Number.isFinite)
  const averageError = average(errors) ?? 0
  let suggestion
  if (node.params.method === 'mirror') {
    suggestion = averageError
  } else {
    const denominator = Math.abs(radialDepth - averageError) < 1e-12 ? radialDepth : radialDepth - averageError
    const multiplier = radialDepth / denominator
    if (node.params.method === 'first_order') {
      suggestion = multiplier * averageError
    } else {
      const referenceAverageStiffness = numberOrNull(node.params.reference_average_stiffness)
      const millingAverageStiffness = numberOrNull(node.params.milling_average_stiffness)
      if (referenceAverageStiffness == null || millingAverageStiffness == null) {
        throw new Error('reference_average_stiffness and milling_average_stiffness are required for stiffness_based compensation.')
      }
      const correctionDenominator = 1 - referenceAverageStiffness / millingAverageStiffness + multiplier
      suggestion = Math.abs(correctionDenominator) < 1e-12 ? averageError : (multiplier / correctionDenominator) * averageError
    }
  }
  return {
    mode: 'local-fallback',
    node_id: node.manifest?.id ?? 'wall-thickness-compensation',
    result: {
      average_error: averageError,
      compensation_plan: {
        contract_version: '1.0',
        delta_radial_depth: suggestion,
        method: node.params.method,
        source_error_summary: {
          average_error: averageError,
          point_count: points.length,
        },
        source_process_id: 'wall-thickness-compensation',
        type: 'machining_compensation_plan',
      },
      message: `local fallback suggestion: ${errorMessage(sourceError, 'backend unavailable')}`,
      method: node.params.method,
      point_count: points.length,
      suggestion_value: suggestion,
    },
    status: 'succeeded',
    trace_id: `platform-${Date.now()}`,
  }
}

async function runArpplNode(node) {
  const input = groupInput(node.groupId)
  const body = input?.files?.source && input?.files?.target
    ? await runArpplFileWorkflow(node, input)
    : await runArpplJsonWorkflow(node)
  node.lastResponse = compactWorkflowBody(body)
  node.data = {
    result: node.lastResponse.result,
    type: 'pose',
  }
  state.lastResponse = node.lastResponse
}

async function runArpplFileWorkflow(node, input) {
  const traceId = `platform-${Date.now()}`
  const apiBase = normalizeApiBase(node.apiBase)
  const form = buildArpplFileForm(node, input, traceId)

  if (node.params.persistRecord) {
    const response = await fetch(`${apiBase}/register-files`, { method: 'POST', body: form })
    const result = await parseJsonResponse(response)
    return {
      mode: 'saved-record',
      node_id: node.manifest?.id ?? 'arppl-process-a',
      result,
      status: 'succeeded',
      trace_id: traceId,
    }
  }

  let response = await fetch(`${apiBase}/workflow/run-files`, { method: 'POST', body: form })
  if (response.status === 404 || response.status === 405) {
    response = await fetch(`${apiBase}/register-files`, { method: 'POST', body: form })
    const result = await parseJsonResponse(response)
    return {
      mode: 'fallback-record',
      node_id: node.manifest?.id ?? 'arppl-process-a',
      result,
      status: 'succeeded',
      trace_id: traceId,
    }
  }
  return parseJsonResponse(response)
}

async function runArpplJsonWorkflow(node) {
  const response = await fetch(`${normalizeApiBase(node.apiBase)}/workflow/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      node_id: node.manifest?.id ?? 'arppl-process-a',
      trace_id: `platform-${Date.now()}`,
      payload: {
        alpha: node.params.alpha.trim() || '-inf',
        max_inner: integerValue(node.params.max_inner, 1),
        max_outer: integerValue(node.params.max_outer, 1),
        return_points: false,
        source_points: [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
        target_normals: [[0, 0, 1], [0, 0, 1], [0, 0, 1]],
        target_points: [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
        u: numberValue(node.params.u, 0.001),
        value_n: numberOrNull(node.params.lower_tol),
        value_p: numberOrNull(node.params.upper_tol),
      },
    }),
  })
  return parseJsonResponse(response)
}

async function runVirtualMachiningNode(node) {
  const initialRequest = buildVirtualPredictionRequest(node.params)
  const authoredThicknessSemantics = node.params.thickness_semantics ?? node.params.thicknessSemantics ?? {}
  const geometryResolution = resolveGeometryArtifactForVirtualNode(state.workflowState, node)
  if (!geometryResolution.ok) throw new Error(geometryResolution.message)
  const artifactWorkpiece = workpieceDimensionsFromGeometryArtifact(geometryResolution.artifact)
  if (artifactWorkpiece) initialRequest.workpiece = artifactWorkpiece
  const geometryThicknessField = geometryResolution.artifact
    ? deriveCurrentThicknessFieldFromTriDexelArtifact(geometryResolution.artifact)
    : null
  if (geometryThicknessField && !geometryThicknessField.ok) {
    recordRuntimeEvent(createGeometryArtifactEvent('current_thickness_field_parse_failed', {
      artifact_id: geometryResolution.artifact.artifact_id,
      consumer_node_id: node.id,
      error: geometryThicknessField.message,
      run_id: state.workflowState.run_id,
      source_node_id: geometryResolution.artifact.source_node_id,
      source_result_version_id: geometryResolution.artifact.source_result_version_id,
      source_visualization_session_id: geometryResolution.artifact.source_visualization_session_id,
    }))
    throw new Error(geometryThicknessField.message)
  }
  if (geometryThicknessField?.ok) {
    recordRuntimeEvent(createGeometryArtifactEvent('current_thickness_field_derived', {
      artifact_id: geometryResolution.artifact.artifact_id,
      consumer_node_id: node.id,
      field_summary: geometryThicknessField.field.summary,
      run_id: state.workflowState.run_id,
      source_node_id: geometryResolution.artifact.source_node_id,
      source_result_version_id: geometryResolution.artifact.source_result_version_id,
      source_visualization_session_id: geometryResolution.artifact.source_visualization_session_id,
    }))
  }
  const thicknessSemanticsConfig = {
    ...authoredThicknessSemantics,
    compensation_value: node.params.compensation_value
      ?? node.params.compensationValue
      ?? authoredThicknessSemantics.compensation_value
      ?? authoredThicknessSemantics.compensationValue,
    current_thickness_field: geometryThicknessField?.field
      ?? node.params.current_thickness_field
      ?? node.params.currentThicknessField
      ?? authoredThicknessSemantics.current_thickness_field
      ?? authoredThicknessSemantics.currentThicknessField,
    design_surface_thickness: node.params.design_surface_thickness
      ?? node.params.designSurfaceThickness
      ?? authoredThicknessSemantics.design_surface_thickness
      ?? authoredThicknessSemantics.designSurfaceThickness,
    execution_surface_thickness: node.params.execution_surface_thickness
      ?? node.params.executionSurfaceThickness
      ?? authoredThicknessSemantics.execution_surface_thickness
      ?? authoredThicknessSemantics.executionSurfaceThickness,
  }
  const thicknessSemantics = buildThicknessSemanticsForPrediction({
    design_process: node.processParameterBase ?? node.params.process,
    key_points: initialRequest.key_points,
    process: initialRequest.process,
    thickness_semantics: thicknessSemanticsConfig,
    workpiece: initialRequest.workpiece,
  })
  const thicknessValidation = validateThicknessSemanticsForPrediction(thicknessSemantics, {
    tool: initialRequest.tool,
  })
  if (!thicknessValidation.ok) throw new Error(thicknessValidation.message)
  const request = requestWithCompatibleRadialDepth(initialRequest, thicknessSemantics)
  const scenePayload = {
    source: 'workflow_platform',
    type: 'virtual_machining_scene',
    geometry_artifact_id: geometryResolution.artifact?.artifact_id ?? null,
    thickness_semantics: thicknessSemantics,
    ...request,
    key_points: parseVirtualKeyPoints(node.params.key_points),
  }
  const unityMessages = ['preview session ready; manual Preview Cutting required']
  node.virtualSceneReady = false

  let body
  const mode = 'virtual-machining-platform'
  try {
    const response = await fetch(`${normalizeApiBase(node.apiBase)}/prediction/wall-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    body = await parseJsonResponse(response)
  } catch (error) {
    const reason = errorMessage(error, 'prediction failed')
    throw new Error(`Virtual machining wall-error prediction failed. ${reason}`)
  }

  const rawPoints = body.points ?? []
  const points = postprocessWallErrorPointsForDesignSurface(rawPoints, thicknessSemantics)
  const designSurfaceSummary = summarizeDesignSurfaceError(points)
  const materialRemovalPreview = buildMaterialRemovalPreviewPayload(request, points, {
    geometry_metadata: geometryResolution.artifact?.geometry_metadata ?? null,
    source_node_id: node.id,
    toolpath: node.params.toolpath,
  })
  node.data = {
    materialRemovalPreview,
    rawWallErrorPoints: rawPoints,
    scenePayload,
    source: node.id,
    summary: body.summary,
    designSurfaceSummary,
    geometryArtifactId: geometryResolution.artifact?.artifact_id ?? null,
    thicknessSemantics,
    type: 'wall_error',
    wallErrorPoints: points,
  }
  node.lastResponse = {
    mode,
    node_id: node.id,
    result: {
      message: body.message,
      material_removal_preview: materialRemovalPreview,
      model_version: body.model_version ?? request.model_version,
      raw_points: rawPoints,
      points,
      scene_payload: scenePayload,
      geometry_artifact_id: geometryResolution.artifact?.artifact_id ?? null,
      design_surface_error_summary: designSurfaceSummary,
      summary: body.summary,
      thickness_semantics: thicknessSemantics,
      unity_messages: unityMessages,
    },
    status: 'succeeded',
    trace_id: `platform-${Date.now()}`,
  }
  state.lastResponse = node.lastResponse
}

function runnableNodesForSelection() {
  const selected = selectedNode()
  const component = selected ? connectedComponent(selected.id) : new Set(state.nodes.map((node) => node.id))
  return topologicalNodeOrder()
    .filter((node) => component.has(node.id))
    .filter((node) => node.type === 'virtual' || node.type === 'process' || isLogicNode(node))
}

function runnableNodesForMode(mode = RUN_MODES.RUN_ALL) {
  return executableNodesForRunMode({
    edges: state.edges,
    mode,
    nodes: state.nodes,
    selectedNodeId: state.selectedNodeId,
    workflowState: state.workflowState,
  })
}

function topologicalNodeOrder() {
  const ids = state.nodes.map((node) => node.id)
  const indegree = new Map(ids.map((id) => [id, 0]))
  state.edges.forEach((edge) => indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1))
  const queue = ids.filter((id) => indegree.get(id) === 0)
  const order = []
  while (queue.length) {
    const id = queue.shift()
    order.push(findNode(id))
    state.edges.filter((edge) => edge.from === id).forEach((edge) => {
      indegree.set(edge.to, (indegree.get(edge.to) ?? 0) - 1)
      if (indegree.get(edge.to) === 0) queue.push(edge.to)
    })
  }
  const orderedIds = new Set(order.filter(Boolean).map((node) => node.id))
  return [...order.filter(Boolean), ...state.nodes.filter((node) => !orderedIds.has(node.id))]
}

function connectedComponent(seedId) {
  const visited = new Set([seedId])
  const queue = [seedId]
  while (queue.length) {
    const id = queue.shift()
    state.edges.forEach((edge) => {
      if (edge.from === id && !visited.has(edge.to)) {
        visited.add(edge.to)
        queue.push(edge.to)
      }
      if (edge.to === id && !visited.has(edge.from)) {
        visited.add(edge.from)
        queue.push(edge.from)
      }
    })
  }
  return visited
}

async function handleFileSelection(nodeId, kind, input) {
  const node = findNode(nodeId)
  if (!node) return
  const process = groupProcess(node.groupId)
  if (process) process.params.visual_sample_size = valueFromInput('#dialogVisualSampleSize', process.params.visual_sample_size)
  const file = input.files?.[0] ?? null
  node.files[kind] = file
  node.geometry[kind] = null
  renderGraph()
  if (!file) {
    if (elements.nodeDialog.open) renderDialogContent()
    return
  }

  setStatus(t('status.geometry'), 'loading')
  try {
    node.geometry[kind] = await inspectPointCloudFile(file)
  } catch (error) {
    node.geometry[kind] = {
      error: errorMessage(error, 'geometry failed'),
      format: t('field.unknown'),
      name: file.name,
    }
  } finally {
    renderGraph()
    if (elements.nodeDialog.open && selectedNode()?.id === node.id) renderDialogContent()
    setStatus(t('status.ready'), 'ready')
  }
}

async function inspectPointCloudFile(file) {
  const text = await file.text()
  const lowerName = file.name.toLowerCase()
  if (lowerName.endsWith('.ply') || text.startsWith('ply')) return inspectPly(file, text)
  if (lowerName.endsWith('.obj') || /^v\s+/m.test(text)) return inspectObj(file, text)
  return {
    error: t('field.unknown'),
    format: t('field.unknown'),
    name: file.name,
    points: null,
  }
}

function inspectPly(file, text) {
  const headerEnd = text.indexOf('end_header')
  if (headerEnd < 0) return { error: 'Missing PLY header', format: 'PLY', name: file.name, points: null }

  const headerText = text.slice(0, headerEnd)
  const headerLines = headerText.split(/\r?\n/)
  const vertexMatch = headerText.match(/element\s+vertex\s+(\d+)/i)
  const vertexCount = vertexMatch ? Number.parseInt(vertexMatch[1], 10) : 0
  const ascii = /format\s+ascii/i.test(headerText)
  const properties = []
  let inVertex = false

  headerLines.forEach((line) => {
    const trimmed = line.trim()
    if (/^element\s+vertex\s+/i.test(trimmed)) {
      inVertex = true
      return
    }
    if (/^element\s+/i.test(trimmed)) inVertex = false
    if (inVertex && /^property\s+/i.test(trimmed)) {
      const parts = trimmed.split(/\s+/)
      properties.push(parts[parts.length - 1])
    }
  })

  const summary = {
    bbox: null,
    format: ascii ? 'PLY ASCII' : 'PLY Binary',
    hasNormals: ['nx', 'ny', 'nz'].every((name) => properties.includes(name)),
    name: file.name,
    points: vertexCount || null,
  }
  if (!ascii) return summary

  const lineEnd = text.indexOf('\n', headerEnd)
  const dataLines = text.slice(lineEnd + 1).split(/\r?\n/)
  const xIndex = properties.indexOf('x')
  const yIndex = properties.indexOf('y')
  const zIndex = properties.indexOf('z')
  if (xIndex < 0 || yIndex < 0 || zIndex < 0) return summary

  let parsed = 0
  for (let index = 0; index < dataLines.length && (!vertexCount || parsed < vertexCount); index += 1) {
    const parts = dataLines[index].trim().split(/\s+/)
    if (parts.length <= Math.max(xIndex, yIndex, zIndex)) continue
    const point = [Number(parts[xIndex]), Number(parts[yIndex]), Number(parts[zIndex])]
    if (point.every(Number.isFinite)) {
      summary.bbox = extendBounds(summary.bbox, point)
      parsed += 1
    }
  }
  summary.points = vertexCount || parsed
  summary.parsedPoints = parsed
  return summary
}

function inspectObj(file, text) {
  const summary = { bbox: null, format: 'OBJ', hasNormals: false, name: file.name, points: 0 }
  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('v ')) {
      const parts = trimmed.split(/\s+/)
      const point = [Number(parts[1]), Number(parts[2]), Number(parts[3])]
      if (point.every(Number.isFinite)) {
        summary.points += 1
        summary.bbox = extendBounds(summary.bbox, point)
      }
    } else if (trimmed.startsWith('vn ')) {
      summary.hasNormals = true
    }
  })
  return summary
}

async function readTextFile(file) {
  const buffer = await file.arrayBuffer()
  for (const encoding of ['utf-8', 'gbk']) {
    try {
      return new TextDecoder(encoding, { fatal: true }).decode(buffer)
    } catch (error) {
      // Try the next common stiffness file encoding.
    }
  }
  return new TextDecoder().decode(buffer)
}

function parseStiffnessKeyPoints(text) {
  const rawLines = text.split(/\r?\n/)
  const matrices = []
  let currentMatrix = []

  rawLines.forEach((rawLine, rawIndex) => {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      if (currentMatrix.length) {
        matrices.push(currentMatrix)
        currentMatrix = []
      }
      return
    }
    currentMatrix.push(parseMatrixRow(line, rawIndex + 1))
  })

  if (currentMatrix.length) matrices.push(currentMatrix)
  if (!matrices.length) throw new Error('刚度文件为空。')

  const rowCount = matrices[0].length
  const colCount = matrices[0][0]?.length ?? 0
  if (!rowCount || !colCount) throw new Error('刚度矩阵至少需要 1 行 1 列。')

  matrices.forEach((matrix, matrixIndex) => {
    if (matrix.length !== rowCount) throw new Error(`第 ${matrixIndex + 1} 个刚度矩阵行数不一致。`)
    matrix.forEach((row, rowIndex) => {
      if (row.length !== colCount) throw new Error(`第 ${matrixIndex + 1} 个刚度矩阵第 ${rowIndex + 1} 行列数不一致。`)
    })
  })

  const points = []
  matrices.forEach((matrix, matrixIndex) => {
    matrix.forEach((row, rowIndex) => {
      row.forEach((stiffness, colIndex) => {
        points.push({
          colIndex,
          id: `K${colIndex + 1}_J${rowIndex + 1}_I${matrixIndex + 1}`,
          matrixIndex,
          rowIndex,
          stiffness,
          x: 0,
          y: 0,
          z: 0,
        })
      })
    })
  })
  return points
}

function parseMatrixRow(line, lineNumber) {
  const values = line.trim().split(/[,\s;]+/).map(Number)
  if (!values.length || values.some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new Error(`刚度矩阵第 ${lineNumber} 行需要全部为正数。`)
  }
  return values
}

function addProcessGroup(process, x, y, options = {}) {
  const groupId = nextNodeId(process.kind)
  const inputId = `${groupId}-input`
  const processId = `${groupId}-process`
  const outputId = `${groupId}-output`
  const inputData = process.kind === 'wall-thickness-compensation'
    ? { source: 'sample', type: 'wall_error', wallErrorPoints: defaultWallErrorPoints() }
    : null

  state.nodes.push(
    {
      data: inputData,
      files: { source: null, target: null },
      geometry: { source: null, target: null },
      groupId,
      id: inputId,
      processKind: process.kind,
      type: 'processInput',
      x,
      y,
    },
    {
      apiBase: process.defaultApiBase,
      data: null,
      groupId,
      id: processId,
      lastResponse: null,
      manifest: null,
      params: clone(process.defaultParameters),
      processId: process.id,
      processKind: process.kind,
      standaloneUrl: process.standaloneUrl,
      type: 'process',
      x: x + PROCESS_GAP,
      y,
    },
    {
      data: null,
      groupId,
      id: outputId,
      lastResponse: null,
      processKind: process.kind,
      type: 'processOutput',
      x: x + PROCESS_GAP * 2,
      y,
    },
  )
  state.edges.push({ from: inputId, to: processId }, { from: processId, to: outputId })
  if (options.select !== false) state.selectedNodeId = processId
  if (options.render !== false) renderGraph()
  return { groupId, inputId, outputId, processId }
}

function addVirtualMachiningNode(x, y, options = {}) {
  const id = nextNodeId('virtual-machining')
  const node = {
    apiBase: defaultVirtualMachiningApiBase(),
    data: null,
    id,
    lastResponse: null,
    params: defaultVirtualMachiningParameters(),
    type: 'virtual',
    virtualSceneReady: false,
    x,
    y,
  }
  captureVirtualProcessBase(node)
  state.nodes.push(node)
  if (options.select !== false) state.selectedNodeId = id
  if (options.render !== false) renderGraph()
  return node
}

function addLogicNode(logicKind, x, y, options = {}) {
  const definition = logicNodeDefinition(logicKind)
  const id = nextNodeId(definition.kind)
  const node = {
    data: null,
    id,
    lastResponse: null,
    logicKind: definition.kind,
    params: clone(definition.defaultParameters),
    type: 'logic',
    x,
    y,
  }
  state.nodes.push(node)
  if (options.select !== false) state.selectedNodeId = id
  if (options.render !== false) renderGraph()
  return node
}

function loadClosedLoopDemo() {
  state.nodes = []
  state.edges = []
  state.connectingFrom = null

  const connect = (from, to) => {
    state.edges = addWorkflowEdge(state.edges, { from, to })
  }
  const configureVirtual = (node, index) => {
    node.params = {
      ...node.params,
      process: {
        ...node.params.process,
        ...(CLOSED_LOOP_DEMO.virtual_parameter_sets[index] ?? {}),
      },
      stiffness_file_name: DEFAULT_STIFFNESS_FILE_NAME,
      stiffness_file_path_hint: CLOSED_LOOP_DEMO.stiffness_file_path,
    }
    captureVirtualProcessBase(node, { overwrite: true })
  }
  const configureUpdate = (node) => {
    node.params = {
      ...node.params,
      sourcePath: 'compensation_plan.radial_depth_delta',
      targetPath: 'process_parameters.radial_depth',
      updateMode: 'add',
    }
  }

  const virtualA = addVirtualMachiningNode(80, 120, { render: false, select: false })
  const conditionA = addLogicNode('condition', 360, 120, { render: false, select: false })
  const wtcA = addProcessGroup(processRegistryByKind('wall-thickness-compensation'), 620, 120, { render: false, select: false })
  const parameterUpdateA = addLogicNode('parameter-update', 1460, 120, { render: false, select: false })
  const virtualB = addVirtualMachiningNode(1740, 120, { render: false, select: false })
  const conditionB = addLogicNode('condition', 2020, 120, { render: false, select: false })
  const wtcB = addProcessGroup(processRegistryByKind('wall-thickness-compensation'), 2280, 120, { render: false, select: false })
  const parameterUpdateB = addLogicNode('parameter-update', 3120, 120, { render: false, select: false })
  const virtualC = addVirtualMachiningNode(3400, 120, { render: false, select: false })
  const stop = addLogicNode('stop', 3680, 120, { render: false, select: false })

  const parameterUpdateBranch = addLogicNode('parameter-update', 3120, 430, { render: false, select: false })
  const virtualD = addVirtualMachiningNode(3400, 430, { render: false, select: false })

  ;[virtualA, virtualB, virtualC, virtualD].forEach(configureVirtual)

  conditionA.params = {
    ...conditionA.params,
    metricPath: 'max_wall_error',
    operator: '>',
    threshold: '0.05',
  }
  conditionB.params = {
    ...conditionB.params,
    metricPath: 'max_wall_error',
    operator: '>',
    threshold: '0.03',
  }
  ;[parameterUpdateA, parameterUpdateB, parameterUpdateBranch].forEach(configureUpdate)
  const wtcBProcess = findNode(wtcB.processId)
  if (wtcBProcess) wtcBProcess.params.method = 'first_order'
  stop.params = {
    ...stop.params,
    maxIterations: '1',
    metricPath: 'max_wall_error',
    stopReason: 'closed-loop convergence check',
    tolerance: '0.02',
  }

  connect(virtualA.id, conditionA.id)
  connect(conditionA.id, wtcA.inputId)
  connect(wtcA.outputId, parameterUpdateA.id)
  connect(parameterUpdateA.id, virtualB.id)
  connect(virtualB.id, conditionB.id)
  connect(conditionB.id, wtcB.inputId)
  connect(wtcB.outputId, parameterUpdateB.id)
  connect(parameterUpdateB.id, virtualC.id)
  connect(virtualC.id, stop.id)

  connect(wtcB.outputId, parameterUpdateBranch.id)
  connect(parameterUpdateBranch.id, virtualD.id)

  state.selectedNodeId = virtualA.id
  arrangeCanvasNodes()
  state.workflowState = createInitialWorkflowState({
    initial_process_parameter_base: createProcessParameterState(state.nodes),
    process_parameters: createProcessParameterState(state.nodes),
    workflow_id: CLOSED_LOOP_DEMO.name,
  })
  publishWorkflowRuntimeState()
  renderGraph()
  setStatus(t('status.demoLoaded'), 'done')
}

function loadTriDexelExportDemo() {
  state.nodes = []
  state.edges = []
  state.connectingFrom = null
  state.pendingTriDexelExportDownload = false

  const virtualNode = addVirtualMachiningNode(120, 120, { render: false, select: false })
  virtualNode.label = 'TriDexel Export VM'
  virtualNode.params = createTriDexelExportDemoVirtualParams()
  captureVirtualProcessBase(virtualNode, { overwrite: true })

  state.selectedNodeId = virtualNode.id
  state.workflowState = createInitialWorkflowState({
    initial_process_parameter_base: createProcessParameterState(state.nodes),
    process_parameters: createProcessParameterState(state.nodes),
    workflow_id: TRIDEXEL_EXPORT_DEMO.name,
  })
  publishWorkflowRuntimeState()
  renderGraph()
  setStatus('TriDexel export demo loaded', 'done')
}

function buildVirtualPredictionRequest(params) {
  const keyPoints = parseVirtualKeyPoints(params.key_points)
  if (!keyPoints.length) throw new Error('At least one stiffness point is required.')
  return {
    key_points: keyPoints.map((point) => ({ id: String(point.id), stiffness: positiveNumber(point.stiffness, 'stiffness') })),
    material: {
      name: params.material.name,
      elasticModulus: params.material.elasticModulus,
      poissonRatio: params.material.poissonRatio,
      density: params.material.density,
    },
    model_version: params.model_version || 'v1.0',
    process: {
      axial_depth: positiveNumber(params.process.axial_depth, 'axial_depth'),
      cutting_mode: params.process.cutting_mode === 'up_milling' ? 'up_milling' : 'down_milling',
      feed_rate: positiveNumber(params.process.feed_rate, 'feed_rate'),
      radial_depth: positiveNumber(params.process.radial_depth, 'radial_depth'),
      spindle_speed: positiveNumber(params.process.spindle_speed, 'spindle_speed'),
    },
    tool: {
      cutter_length: positiveNumber(params.tool.cutter_length, 'cutter_length'),
      diameter: positiveNumber(params.tool.diameter, 'diameter'),
      helix_angle: numberValue(params.tool.helix_angle, 30),
      immersion_angle: numberValue(params.tool.immersion_angle, 90),
      overall_length: positiveNumber(params.tool.overall_length, 'overall_length'),
      teeth: integerValue(params.tool.teeth, 2),
      type: params.tool.type || 'flat_end_mill',
    },
    workpiece: {
      base_height: positiveNumber(params.workpiece.base_height, 'base_height'),
      base_width: positiveNumber(params.workpiece.base_width, 'base_width'),
      height: positiveNumber(params.workpiece.height, 'height'),
      length: positiveNumber(params.workpiece.length, 'length'),
      thickness: positiveNumber(params.workpiece.thickness, 'thickness'),
    },
  }
}

function buildMaterialRemovalPreviewPayload(request, points, context = {}) {
  return buildUnityMachiningJobPayload({
    node_result_version_id: context.node_result_version_id ?? context.nodeResultVersionId ?? null,
    points,
    preview_level: context.preview_level ?? 'operation',
    geometry_metadata: context.geometry_metadata ?? context.geometryMetadata ?? null,
    request,
    source_node_id: context.source_node_id ?? context.sourceNodeId ?? null,
    toolpath: context.toolpath ?? null,
  })
}

function outputPayloadForNode(node) {
  if (!node) return null
  if (node.type === 'virtual') {
    if (!node.data?.wallErrorPoints) return null
    return {
      points: node.data.wallErrorPoints,
      summary: node.data.summary,
      type: 'wall_error',
    }
  }
  if (node.type === 'processInput') {
    if (node.processKind === 'wall-thickness-compensation') {
      return { points: wallErrorPointsForInput(node), type: 'wall_error' }
    }
    return { files: node.files, geometry: node.geometry, type: 'point_cloud_pair' }
  }
  if (node.type === 'process') return node.data
  if (node.type === 'processOutput') return node.data
  return null
}

function nodeOutputType(node) {
  if (!node) return null
  if (isLogicNode(node)) return 'logic_control'
  if (node.type === 'virtual') return 'wall_error'
  if (node.type === 'processInput' || node.type === 'process' || node.type === 'processOutput') {
    const registry = processRegistryByKind(node.processKind)
    return node.type === 'processInput' ? registry.inputType : registry.outputType
  }
  return null
}

function nodeInputTypes(node) {
  if (!node) return []
  if (isLogicNode(node)) return ['point_cloud_pair', 'pose', 'wall_error', 'compensation_plan', 'process_params', 'logic_control']
  if (node.type === 'virtual') return ['process_params', 'compensation_plan', 'pose']
  if (node.type === 'processInput') {
    if (node.processKind === 'wall-thickness-compensation') return ['wall_error']
    return []
  }
  if (node.type === 'process') return [processRegistryByKind(node.processKind).inputType]
  if (node.type === 'processOutput') return [processRegistryByKind(node.processKind).outputType]
  return []
}

function hasInputPort(node) {
  return isLogicNode(node) || nodeInputTypes(node).length > 0 || node.type === 'process' || node.type === 'processOutput'
}

function hasOutputPort(node) {
  return isLogicNode(node) || node.type === 'virtual' || node.type === 'processInput' || node.type === 'process' || node.type === 'processOutput'
}

function wallErrorPointsForInput(node) {
  if (node?.data?.wallErrorPoints) return node.data.wallErrorPoints
  const process = groupProcess(node?.groupId)
  return parseErrorPoints(process?.params.error_points, { quiet: true })
}

function wallErrorPointsForProcess(node) {
  const input = groupInput(node.groupId)
  if (input?.data?.wallErrorPoints?.length) return input.data.wallErrorPoints
  return parseErrorPoints(node.params.error_points, { quiet: true })
}

function parseErrorPoints(value, options = {}) {
  try {
    const parsed = JSON.parse(value || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    if (!options.quiet) throw new Error('Error points JSON is invalid.')
    return []
  }
}

function parseVirtualKeyPoints(value) {
  const parsed = JSON.parse(value || '[]')
  if (!Array.isArray(parsed)) throw new Error('Stiffness points JSON must be an array.')
  return parsed
}

function fileBlockHtml(kind, file, geometry) {
  return `
    <article class="info-card">
      <span>${escapeHtml(kind === 'source' ? t('files.source') : t('files.target'))}</span>
      <strong title="${escapeHtml(file?.name ?? t('files.unselected'))}">${escapeHtml(file?.name ?? t('files.unselected'))}</strong>
      ${geometrySummaryHtml(geometry)}
    </article>
  `
}

function geometrySummaryHtml(geometry) {
  if (!geometry) return `<p class="muted">${escapeHtml(t('files.unselected'))}</p>`
  if (geometry.error) return `<p class="error-text">${escapeHtml(geometry.error)}</p>`
  return `
    <dl class="kv-list">
      <dt>${escapeHtml(t('field.format'))}</dt><dd>${escapeHtml(geometry.format ?? t('field.unknown'))}</dd>
      <dt>${escapeHtml(t('field.points'))}</dt><dd>${escapeHtml(formatCount(geometry.points))}</dd>
      <dt>${escapeHtml(t('field.normals'))}</dt><dd>${escapeHtml(geometry.hasNormals ? t('field.yes') : t('field.no'))}</dd>
      <dt>${escapeHtml(t('field.bbox'))}</dt><dd>${escapeHtml(formatBounds(geometry.bbox))}</dd>
    </dl>
  `
}

function buildArpplFileForm(node, input, traceId) {
  const form = new FormData()
  form.append('source', input.files.source)
  form.append('target', input.files.target)
  form.append('node_id', node.manifest?.id ?? 'arppl-process-a')
  form.append('trace_id', traceId)
  form.append('u', node.params.u)
  form.append('alpha', node.params.alpha)
  form.append('value_n', node.params.lower_tol)
  form.append('value_p', node.params.upper_tol)
  form.append('max_outer', node.params.max_outer)
  form.append('max_inner', node.params.max_inner)
  form.append('stop', '0.00001')
  form.append('use_anderson', 'true')
  form.append('registration_sample_size', registrationSampleSize(node))
  form.append('visual_sample_size', node.params.visual_sample_size)
  return form
}

async function parseJsonResponse(response) {
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(detailMessage(body) || `HTTP ${response.status}`)
  return body
}

function detailMessage(body) {
  if (!body) return ''
  if (typeof body.detail === 'string') return body.detail
  if (Array.isArray(body.detail)) return body.detail.map((item) => item.msg ?? JSON.stringify(item)).join('; ')
  if (body.error) return String(body.error)
  return ''
}

async function sendLastResultToVirtualMachining() {
  const selected = selectedNode()
  const response = selected?.lastResponse ?? selected?.data ?? state.lastResponse
  if (!response) {
    setStatus(t('result.empty'), 'error')
    return
  }
  try {
    await state.virtualMachining.sendWorkflowResult(response)
    setStatus(t('status.done'), 'done')
  } catch (error) {
    setStatus(errorMessage(error, 'virtual machining failed'), 'error')
  }
}

async function previewSelectedVirtualCutting() {
  const prepared = await prepareSelectedVirtualMachiningScene()
  if (!prepared) return
  await startSelectedVirtualCutting({ requirePrepared: true })
}

function selectedVirtualPreviewContext() {
  const node = selectedNode()
  if (!node || node.type !== 'virtual') return null
  const session = latestVisualizationSessionForNode(state.workflowState, node.id)
  const points = session?.unity_payload?.points ?? node.data?.wallErrorPoints ?? []
  if (!session || !points.some((point) => Number.isFinite(Number(point.error)))) {
    setStatus(t('param.previewCutting'), 'error')
    return null
  }
  return { node, session, points }
}

function blockIfVirtualPreviewUnavailable() {
  const widgetRuntimeStatus = state.virtualMachining?.runtimeStatus?.() ?? {}
  if (widgetRuntimeStatus.runtime_unstable) {
    updatePreviewRuntimeStatus({
      block_reason: widgetRuntimeStatus.block_reason ?? 'repeated_runtime_warning',
      last_runtime_warning: widgetRuntimeStatus.last_runtime_warning ?? null,
      safe_to_preview: false,
      status: 'runtime_unstable',
    })
    setStatus(previewRuntimeStatusLabel(currentPreviewRuntimeStatus()), 'error')
    publishWorkflowRuntimeState()
    return true
  }
  if (state.virtualPreviewInFlight) {
    setStatus('Unity preview is already running; wait for the current preview to finish.', 'error')
    return true
  }
  return false
}

async function prepareSelectedVirtualMachiningScene() {
  if (blockIfVirtualPreviewUnavailable()) return null
  const context = selectedVirtualPreviewContext()
  if (!context) return null
  const { node, session } = context
  state.virtualPreviewInFlight = true
  updatePreviewRuntimeStatus({
    current_session_id: session.visualization_session_id,
    last_runtime_warning: null,
    node_id: node.id,
    node_short_label: shortPreviewNodeLabel(node.id, session.node_display_label),
    safe_to_preview: false,
    status: 'busy',
    visualization_session_id: session.visualization_session_id,
  })
  try {
    await prepareVirtualMachiningSceneForSession(node, session)
    updatePreviewRuntimeStatus({
      current_session_id: session.visualization_session_id,
      last_runtime_warning: null,
      node_id: node.id,
      node_short_label: shortPreviewNodeLabel(node.id, session.node_display_label),
      safe_to_preview: true,
      status: 'ready_for_next_preview',
      visualization_session_id: session.visualization_session_id,
    })
    setStatus(`Unity scene prepared: ${visualizationSessionDiagnostics(session)}`, 'done')
    publishWorkflowRuntimeState()
    renderGraph()
    return context
  } catch (error) {
    handleVirtualPreviewFailure(error, node, session, 'Unity scene preparation failed', 'visualization_scene_prepare_failed')
    return null
  } finally {
    state.virtualPreviewInFlight = false
    publishWorkflowRuntimeState()
    renderGraph()
  }
}

async function prepareVirtualMachiningSceneForSession(node, session) {
  const geometryResolution = resolveGeometryArtifactForVirtualNode(state.workflowState, node)
  if (!geometryResolution.ok) throw new Error(geometryResolution.message)
  const expected_workpiece_thickness = session.unity_payload?.workpiece?.thickness ?? session.scene_payload?.workpiece?.thickness ?? null
  const expected_error_cloud_summary = session.payload_summary ?? null
  recordRuntimeEvent({
    event_type: 'preview_scene_expected',
    node_id: node.id,
    node_type: node.type,
    payload: {
      consumer_node_id: node.id,
      expected_error_cloud_summary,
      expected_execution_surface_thickness: session.scene_payload?.thickness_semantics?.execution_surface_thickness ?? null,
      expected_design_surface_thickness: session.scene_payload?.thickness_semantics?.design_surface_thickness ?? null,
      expected_workpiece_thickness,
      geometry_artifact_id: geometryResolution.artifact?.artifact_id ?? null,
      node_display_label: session.node_display_label,
      node_result_version_id: session.node_result_version_id,
      source_node_id: geometryResolution.artifact?.source_node_id ?? null,
      source_result_version_id: geometryResolution.artifact?.source_result_version_id ?? null,
      visualization_session_id: session.visualization_session_id,
    },
    summary: `Unity preview scene expected: ${session.visualization_session_id}`,
  })
  state.workflowState = activateVisualizationSession(state.workflowState, session.visualization_session_id)
  recordRuntimeEvent({
    event_type: 'visualization_scene_prepare_started',
    node_id: node.id,
    node_type: node.type,
    payload: {
      node_display_label: session.node_display_label,
      node_result_version_id: session.node_result_version_id,
      state_change_summary: visualizationSessionDiagnostics(session),
      visualization_session_id: session.visualization_session_id,
    },
    summary: `Unity scene preparation started: ${session.visualization_session_id}`,
  })
  setStatus(`Preparing Unity scene: ${visualizationSessionDiagnostics(session)}`, 'running')
  const scenePayload = session.scene_payload ?? {
    source: 'workflow_platform',
    type: 'virtual_machining_scene',
    ...buildVirtualPredictionRequest(node.params),
    key_points: parseVirtualKeyPoints(node.params.key_points),
  }
  await state.virtualMachining.resetScene()
  if (geometryResolution.artifact) {
    window.workflowVirtualMachiningScenePayload = scenePayload
    const previewValidation = validateGeometryArtifactForUnityPreview(geometryResolution.artifact)
    if (!previewValidation.ok) throw new Error(previewValidation.message)
    const imported = await state.virtualMachining.importTriDexelImage(geometryResolution.artifact.data_base64)
    if (!imported) throw new Error(`Unity did not accept geometry artifact ${geometryResolution.artifact.artifact_id}.`)
    recordRuntimeEvent(createGeometryArtifactEvent('geometry_artifact_imported', {
      artifact_id: geometryResolution.artifact.artifact_id,
      consumer_node_id: node.id,
      run_id: state.workflowState.run_id,
      source_node_id: geometryResolution.artifact.source_node_id,
      source_result_version_id: geometryResolution.artifact.source_result_version_id,
      source_visualization_session_id: geometryResolution.artifact.source_visualization_session_id,
    }))
  } else {
    await state.virtualMachining.loadScene(scenePayload)
  }
  await clearVirtualMachiningErrorCloud(session)
  await refreshVirtualMachiningErrorCloud(node, session)
  state.nodes
    .filter((candidate) => candidate.type === 'virtual')
    .forEach((candidate) => {
      candidate.virtualSceneReady = candidate.id === node.id
    })
  recordRuntimeEvent({
    event_type: 'visualization_scene_prepared',
    node_id: node.id,
    node_type: node.type,
    payload: {
      node_display_label: session.node_display_label,
      node_result_version_id: session.node_result_version_id,
      payload_summary: session.payload_summary,
      state_change_summary: visualizationSessionDiagnostics(session),
      visualization_session_id: session.visualization_session_id,
    },
    summary: `Unity scene prepared: ${session.visualization_session_id}`,
  })
}

async function applyCurrentVirtualMachiningErrorCloud() {
  if (blockIfVirtualPreviewUnavailable()) return false
  const context = selectedVirtualPreviewContext()
  if (!context) return false
  const { node, session } = context
  if (!node.virtualSceneReady) {
    setStatus('Prepare Scene before applying the current VM error cloud.', 'error')
    return false
  }
  state.virtualPreviewInFlight = true
  updatePreviewRuntimeStatus({
    current_session_id: session.visualization_session_id,
    last_runtime_warning: null,
    node_id: node.id,
    node_short_label: shortPreviewNodeLabel(node.id, session.node_display_label),
    safe_to_preview: false,
    status: 'busy',
    visualization_session_id: session.visualization_session_id,
  })
  try {
    await clearVirtualMachiningErrorCloud(session)
    await refreshVirtualMachiningErrorCloud(node, session)
    updatePreviewRuntimeStatus({
      current_session_id: session.visualization_session_id,
      last_runtime_warning: null,
      node_id: node.id,
      node_short_label: shortPreviewNodeLabel(node.id, session.node_display_label),
      safe_to_preview: true,
      status: 'ready_for_next_preview',
      visualization_session_id: session.visualization_session_id,
    })
    setStatus('Current VM error cloud applied.', 'done')
    publishWorkflowRuntimeState()
    renderGraph()
    return true
  } catch (error) {
    handleVirtualPreviewFailure(error, node, session, 'Unity error cloud application failed', 'visualization_error_cloud_failed')
    return false
  } finally {
    state.virtualPreviewInFlight = false
    publishWorkflowRuntimeState()
    renderGraph()
  }
}

async function startSelectedVirtualCutting() {
  if (blockIfVirtualPreviewUnavailable()) return false
  const context = selectedVirtualPreviewContext()
  if (!context) return false
  const { node, session } = context
  if (!node.virtualSceneReady) {
    setStatus('Prepare Scene before starting cutting.', 'error')
    return false
  }
  state.virtualPreviewInFlight = true
  updatePreviewRuntimeStatus({
    current_session_id: session.visualization_session_id,
    last_runtime_warning: null,
    node_id: node.id,
    node_short_label: shortPreviewNodeLabel(node.id, session.node_display_label),
    safe_to_preview: false,
    status: 'busy',
    visualization_session_id: session.visualization_session_id,
  })
  try {
    state.pendingGeometryCaptureSessionId = session.visualization_session_id
    recordRuntimeEvent({
      event_type: 'visualization_preview_started',
      node_id: node.id,
      node_type: node.type,
      payload: {
        node_display_label: session.node_display_label,
        node_result_version_id: session.node_result_version_id,
        payload_summary: session.payload_summary,
        state_change_summary: visualizationSessionDiagnostics(session),
        visualization_session_id: session.visualization_session_id,
      },
      summary: `Unity preview started: ${session.visualization_session_id}`,
    })
    setStatus(`Previewing ${visualizationSessionDiagnostics(session)}`, 'running')
    const completionPromise = waitForUnityMachiningCompletion(session.visualization_session_id)
    await state.virtualMachining.startMaterialRemovalPreview(session.unity_payload)
    const completionDetail = await completionPromise
    if (completionDetail?.invalidated) throw new Error(completionDetail.runtime_warning ?? 'Unity preview session invalidated')
    state.workflowState = completeVisualizationSession(state.workflowState, session.visualization_session_id)
    recordRuntimeEvent({
      event_type: 'visualization_preview_completed',
      node_id: node.id,
      node_type: node.type,
      payload: {
        node_display_label: session.node_display_label,
        node_result_version_id: session.node_result_version_id,
        payload_summary: session.payload_summary,
        state_change_summary: visualizationSessionDiagnostics(session),
        visualization_session_id: session.visualization_session_id,
      },
      summary: `Unity preview completed: ${session.visualization_session_id}`,
    })
    const messages = node.lastResponse?.result?.unity_messages
    if (Array.isArray(messages)) messages.push('cutting preview sent')
    updatePreviewRuntimeStatus({
      current_session_id: session.visualization_session_id,
      last_runtime_warning: null,
      node_id: node.id,
      node_short_label: shortPreviewNodeLabel(node.id, session.node_display_label),
      requires_rerun_node_id: null,
      safe_to_preview: true,
      status: 'ready_for_next_preview',
      visualization_session_id: session.visualization_session_id,
    })
    setStatus(t('status.done'), 'done')
    publishWorkflowRuntimeState()
    renderGraph()
    return true
  } catch (error) {
    handleVirtualPreviewFailure(error, node, session, 'Unity cutting preview failed', 'visualization_preview_failed')
    return false
  } finally {
    if (state.pendingGeometryCaptureSessionId === session.visualization_session_id) {
      state.pendingGeometryCaptureSessionId = null
    }
    state.virtualPreviewInFlight = false
    publishWorkflowRuntimeState()
    renderGraph()
  }
}

function handleVirtualPreviewFailure(error, node, session, fallbackMessage, eventType) {
  if (isRecoverableUnityPreviewError(error)) {
    invalidateCurrentVisualizationPreview(error)
  }
  const currentSession = findVisualizationSession(state.workflowState, session.visualization_session_id)
  if (currentSession?.status !== 'invalidated') {
    state.workflowState = failVisualizationSession(state.workflowState, session.visualization_session_id, {
      error: errorMessage(error, fallbackMessage),
    })
  }
  recordRuntimeEvent({
    event_type: eventType,
    node_id: node.id,
    node_type: node.type,
    payload: {
      error: errorMessage(error, fallbackMessage),
      node_display_label: session.node_display_label,
      node_result_version_id: session.node_result_version_id,
      visualization_session_id: session.visualization_session_id,
    },
    summary: errorMessage(error, fallbackMessage),
  })
  if (isRecoverableUnityPreviewError(error)) {
    updatePreviewRuntimeStatus({
      current_session_id: session.visualization_session_id,
      last_runtime_warning: errorMessage(error, fallbackMessage),
      node_id: node.id,
      node_short_label: shortPreviewNodeLabel(node.id, session.node_display_label),
      requires_rerun_node_id: node.id,
      safe_to_preview: false,
      status: 'recovering',
      visualization_session_id: session.visualization_session_id,
    })
    setStatus(previewRuntimeStatusLabel(currentPreviewRuntimeStatus()), 'running')
  } else {
    updatePreviewRuntimeStatus({
      current_session_id: session.visualization_session_id,
      last_runtime_warning: errorMessage(error, fallbackMessage),
      node_id: node.id,
      node_short_label: shortPreviewNodeLabel(node.id, session.node_display_label),
      safe_to_preview: true,
      status: 'failed',
      visualization_session_id: session.visualization_session_id,
    })
    setStatus(errorMessage(error, fallbackMessage), 'error')
  }
  publishWorkflowRuntimeState()
  renderGraph()
}

function waitForUnityMachiningCompletion(sessionId, timeoutMs = 120000) {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return Promise.resolve(null)
  return new Promise((resolve) => {
    let settled = false
    let timeoutId = null
    const cleanup = (detail = null) => {
      if (settled) return
      settled = true
      window.removeEventListener('UnityMachiningCompleted', handleCompleted)
      window.removeEventListener('UnityMaterialRemovalPreviewCompleted', handleCompleted)
      window.removeEventListener('WorkflowUnityRuntimeInvalidated', handleInvalidated)
      if (timeoutId != null) window.clearTimeout(timeoutId)
      resolve(detail)
    }
    const handleCompleted = (event) => cleanup(event?.detail ?? null)
    const handleInvalidated = (event) => {
      const detail = event?.detail ?? {}
      if (detail.visualization_session_id !== sessionId) return
      cleanup({
        invalidated: true,
        runtime_warning: detail.runtime_warning ?? 'Unity preview session invalidated',
      })
    }
    window.addEventListener('UnityMachiningCompleted', handleCompleted)
    window.addEventListener('UnityMaterialRemovalPreviewCompleted', handleCompleted)
    window.addEventListener('WorkflowUnityRuntimeInvalidated', handleInvalidated)
    timeoutId = window.setTimeout(() => {
      if (state.pendingGeometryCaptureSessionId === sessionId) state.pendingGeometryCaptureSessionId = null
      cleanup(null)
    }, timeoutMs)
  })
}

async function clearVirtualMachiningErrorCloud(session) {
  const payload = buildUnityWallErrorFieldPayload({
    clear_existing: true,
    node_result_version_id: session.node_result_version_id ?? null,
    points: [],
    source_node_id: session.virtual_node_id ?? null,
    visualization_session_id: session.visualization_session_id ?? null,
  })
  if (typeof window !== 'undefined') window.workflowLastWallErrorFieldPayload = payload
  const cleared = await state.virtualMachining.showWallErrorField(payload)
  if (!cleared) throw new Error('Unity did not accept clear request for imported wall-error field.')

  recordRuntimeEvent({
    event_type: 'visualization_error_cloud_cleared',
    node_id: session.virtual_node_id,
    node_type: 'virtual',
    payload: {
      node_display_label: session.node_display_label,
      node_result_version_id: session.node_result_version_id,
      state_change_summary: visualizationSessionDiagnostics(session),
      visualization_session_id: session.visualization_session_id,
    },
    summary: `Unity error cloud cleared before imported preview: ${session.visualization_session_id}`,
  })
  return true
}

async function refreshVirtualMachiningErrorCloud(node, session) {
  const points = Array.isArray(session?.unity_payload?.points) && session.unity_payload.points.length > 0
    ? session.unity_payload.points
    : node?.data?.wallErrorPoints ?? []
  if (!points.some((point) => Number.isFinite(Number(point.error)))) return false

  const payload = buildUnityWallErrorFieldPayload({
    node_result_version_id: session.node_result_version_id ?? null,
    points,
    source_node_id: session.virtual_node_id ?? null,
    visualization_session_id: session.visualization_session_id ?? null,
  })
  if (typeof window !== 'undefined') window.workflowLastWallErrorFieldPayload = payload

  const refreshed = await state.virtualMachining.showWallErrorField(payload)
  if (!refreshed) throw new Error('Unity did not accept refreshed wall-error field for current virtual machining node.')

  recordRuntimeEvent({
    event_type: 'visualization_error_cloud_refreshed',
    node_id: session.virtual_node_id,
    node_type: 'virtual',
    payload: {
      node_display_label: session.node_display_label,
      node_result_version_id: session.node_result_version_id,
      payload_summary: session.payload_summary,
      state_change_summary: visualizationSessionDiagnostics(session),
      visualization_session_id: session.visualization_session_id,
    },
    summary: `Unity error cloud refreshed: ${session.visualization_session_id}`,
  })
  return true
}

async function reloadVirtualMachiningRuntime() {
  try {
    updatePreviewRuntimeStatus({
      block_reason: null,
      last_runtime_warning: null,
      requires_rerun_node_id: null,
      safe_to_preview: false,
      status: 'reloading',
    })
    publishWorkflowRuntimeState()
    await state.virtualMachining.reloadRuntime()
    state.nodes
      .filter((node) => node.type === 'virtual')
      .forEach((node) => {
        node.virtualSceneReady = false
      })
    updatePreviewRuntimeStatus({
      block_reason: null,
      last_runtime_warning: null,
      requires_rerun_node_id: null,
      safe_to_preview: true,
      status: 'ready_for_next_preview',
    })
    setStatus('Unity runtime reloaded. Prepare the selected VM scene before cutting.', 'done')
    publishWorkflowRuntimeState()
    renderGraph()
  } catch (error) {
    updatePreviewRuntimeStatus({
      last_runtime_warning: errorMessage(error, 'Unity runtime reload failed'),
      safe_to_preview: false,
      status: 'runtime_unstable',
    })
    setStatus(errorMessage(error, 'Unity runtime reload failed'), 'error')
    publishWorkflowRuntimeState()
  }
}
async function resetVirtualMachiningScene() {
  try {
    await state.virtualMachining.resetScene()
    state.virtualMachining.clearRuntimeWarnings?.()
    updatePreviewRuntimeStatus({
      block_reason: null,
      last_runtime_warning: null,
      requires_rerun_node_id: null,
      safe_to_preview: true,
      status: 'ready_for_next_preview',
    })
    state.nodes
      .filter((node) => node.type === 'virtual')
      .forEach((node) => {
        node.virtualSceneReady = false
      })
    setStatus(t('status.ready'), 'ready')
  } catch (error) {
    setStatus(errorMessage(error, 'Unity reset failed'), 'error')
  }
}

function openStandaloneApp() {
  const process = selectedProcessNode()
  const node = selectedNode()
  const url = process?.standaloneUrl ?? node?.standaloneUrl
  if (url) window.open(url, '_blank', 'noopener,noreferrer')
}

function saveApiBaseFromField() {
  const node = selectedNode()
  const target = node?.type === 'process' || node?.type === 'virtual' ? node : selectedProcessNode()
  if (target?.apiBase) target.apiBase = elements.apiBase.value.trim() || target.apiBase
}

function syncApiBaseField() {
  const node = selectedNode()
  const target = node?.type === 'process' || node?.type === 'virtual' ? node : selectedProcessNode()
  elements.apiBase.value = target?.apiBase ?? ''
  elements.apiBase.disabled = !target
}

function selectedProcessNode() {
  const node = selectedNode()
  if (!node) return null
  if (node.type === 'process') return node
  if (node.groupId) return groupProcess(node.groupId)
  return null
}

function selectedProcessKind() {
  return selectedProcessNode()?.processKind ?? null
}

function isLogicNode(node) {
  return node?.type === 'logic'
}

function logicNodeDefinition(kind) {
  return LOGIC_NODE_DEFINITIONS[kind] ?? LOGIC_NODE_DEFINITIONS.condition
}

function selectedNode() {
  return findNode(state.selectedNodeId)
}

function findNode(id) {
  return state.nodes.find((node) => node.id === id) ?? null
}

function groupInput(groupId) {
  return state.nodes.find((node) => node.groupId === groupId && node.type === 'processInput') ?? null
}

function groupProcess(groupId) {
  return state.nodes.find((node) => node.groupId === groupId && node.type === 'process') ?? null
}

function groupOutput(groupId) {
  return state.nodes.find((node) => node.groupId === groupId && node.type === 'processOutput') ?? null
}

function processRegistryByKind(kind) {
  return processRegistry.find((process) => process.kind === kind) ?? processRegistry[0]
}

function nodeLabel(nodeId) {
  const node = findNode(nodeId)
  return node ? nodeSpec(node).name : nodeId
}

function workflowNodeDisplayLabels() {
  return new Map(topologicalNodeOrder().map((node, index) => [node.id, `#${index + 1}`]))
}

function workflowNodeDisplayLabel(node) {
  if (!node) return ''
  const displayLabel = workflowNodeDisplayLabels().get(node.id) ?? ''
  return `${displayLabel} ${nodeSpec(node).name}`.trim()
}

function activeVisualizationSession() {
  const activeId = state.workflowState?.active_visualization_session_id
  if (!activeId) return null
  return (state.workflowState.visualization_sessions ?? [])
    .find((session) => session.visualization_session_id === activeId) ?? null
}

function pathExists(fromId, toId, visited = new Set()) {
  if (fromId === toId) return true
  if (visited.has(fromId)) return false
  visited.add(fromId)
  return state.edges
    .filter((edge) => edge.from === fromId)
    .some((edge) => pathExists(edge.to, toId, visited))
}

function canvasPointFromEvent(event) {
  const rect = elements.graphCanvas.getBoundingClientRect()
  return {
    x: clamp(event.clientX - rect.left - NODE_WIDTH / 2, NODE_MARGIN, Math.max(NODE_MARGIN, elements.graphCanvas.clientWidth - NODE_WIDTH - NODE_MARGIN)),
    y: clamp(event.clientY - rect.top - NODE_HEIGHT / 2, NODE_MARGIN, Math.max(NODE_MARGIN, elements.graphCanvas.clientHeight - NODE_HEIGHT - NODE_MARGIN)),
  }
}

function nextNodeId(prefix) {
  const id = `${prefix}-${state.idCounter}`
  state.idCounter += 1
  return id
}

function dialogSaveFooter() {
  return `
    <button class="secondary" type="button" data-dialog-action="close">${escapeHtml(t('actions.close'))}</button>
    <button type="button" data-dialog-action="save">${escapeHtml(t('actions.save'))}</button>
  `
}

function dialogProcessFooter() {
  return `
    <button class="secondary" type="button" data-dialog-action="openApp">${escapeHtml(t('actions.openApp'))}</button>
    <button class="secondary" type="button" data-dialog-action="run">${escapeHtml(t('actions.run'))}</button>
    <button type="button" data-dialog-action="save">${escapeHtml(t('actions.save'))}</button>
  `
}

function textField(id, label, value, mode = '') {
  const readonly = mode === 'readonly' ? ' readonly' : ''
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <input id="${escapeHtml(id)}" value="${escapeHtml(value ?? '')}"${readonly} />
    </label>
  `
}

function textAreaField(id, label, value) {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <textarea id="${escapeHtml(id)}" spellcheck="false">${escapeHtml(value ?? '')}</textarea>
    </label>
  `
}

function selectField(id, label, value, options) {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <select id="${escapeHtml(id)}">
        ${options.map((option) => `<option value="${escapeHtml(option)}" ${value === option ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}
      </select>
    </label>
  `
}

function workpiecePreviewHtml(dimensions) {
  const values = dimensions ?? { baseHeight: 16, baseWidth: 64, height: 56, length: 120, thickness: 3, wallHeight: 40 }
  return `
    <article class="workpiece-preview" data-workpiece-preview style="--rx:-24deg; --rz:-38deg">
      <div class="preview-title">
        <span>${escapeHtml(t('param.workpiecePreview'))}</span>
        <strong data-preview-summary>${escapeHtml(workpieceSummaryText(values))}</strong>
      </div>
      <div class="workpiece-stage">
        <div class="workpiece-model">
          <div class="workpiece-base"></div>
          <div class="workpiece-wall"></div>
          <span class="dim dim-length">L</span>
          <span class="dim dim-width">W</span>
          <span class="dim dim-height">H1</span>
          <span class="dim dim-base">H2</span>
          <span class="dim dim-thickness">t</span>
        </div>
      </div>
    </article>
  `
}

function toolPreviewHtml(toolId) {
  const tool = TOOL_LIBRARY.find((item) => item.id === toolId)
  return `
    <article class="tool-preview" data-tool-preview>
      <div class="tool-illustration">
        <span class="tool-shank"></span>
        <span class="tool-cutter"></span>
        <span class="tool-flute tool-flute-a"></span>
        <span class="tool-flute tool-flute-b"></span>
      </div>
      <dl class="kv-list">
        <dt>${escapeHtml(t('param.toolType'))}</dt><dd>${escapeHtml(tool?.label ?? t('files.unselected'))}</dd>
        <dt>D / Z</dt><dd>${escapeHtml(tool ? `${tool.diameter} mm / ${tool.teeth}` : '--')}</dd>
      </dl>
    </article>
  `
}

function bindVirtualDialogInteractions(node) {
  const materialSelect = document.querySelector('#vmMaterialSelect')
  const toolSelect = document.querySelector('#vmToolSelect')
  const workpiecePresetSelect = document.querySelector('#vmWorkpiecePreset')
  const workpieceSourceMode = document.querySelector('#vmWorkpieceSourceMode')
  const geometryArtifactSelect = document.querySelector('#vmGeometryArtifactSelect')
  const geometryArtifactFile = document.querySelector('#vmGeometryArtifactFile')
  const stiffnessFile = document.querySelector('#vmStiffnessFile')
  const toolpathFile = document.querySelector('#vmToolpathFile')
  const importGeometryArtifactButton = document.querySelector('[data-dialog-action="importTriDexelArtifact"]')
  const importButton = document.querySelector('[data-dialog-action="importStiffness"]')
  const importToolpathButton = document.querySelector('[data-dialog-action="importToolpath"]')
  const dimensionInputs = ['#vmLength', '#vmHeight', '#vmThickness', '#vmBaseWidth', '#vmBaseHeight']
    .map((selector) => document.querySelector(selector))
    .filter(Boolean)
  const processInputs = ['#vmSpindleSpeed', '#vmFeedRate', '#vmAxialDepth', '#vmRadialDepth', '#vmDesignSurfaceThickness']
    .map((selector) => document.querySelector(selector))
    .filter(Boolean)
  const toolInputs = ['#vmDiameter', '#vmTeeth', '#vmHelixAngle', '#vmCutterLength', '#vmOverallLength']
    .map((selector) => document.querySelector(selector))
    .filter(Boolean)

  bindVirtualTabs()
  renderVirtualDialogPreviews()
  requestAnimationFrame(renderVirtualDialogPreviews)
  updateWorkpieceSourcePanels()
  updateVirtualPreviewPanel()

  materialSelect?.addEventListener('change', () => {
    const material = MATERIAL_LIBRARY.find((item) => item.id === materialSelect.value)
    setInputValue('#vmMaterialName', material?.name ?? '')
    setInputValue('#vmElasticModulus', material?.elasticModulus ?? '')
    setInputValue('#vmPoissonRatio', material?.poissonRatio ?? '')
    setInputValue('#vmDensity', material?.density ?? '')
  })

  toolSelect?.addEventListener('change', () => {
    const tool = TOOL_LIBRARY.find((item) => item.id === toolSelect.value)
    setInputValue('#vmToolType', tool?.type ?? '')
    setInputValue('#vmDiameter', tool?.diameter ?? '')
    setInputValue('#vmTeeth', tool?.teeth ?? '')
    setInputValue('#vmHelixAngle', tool?.helix_angle ?? '')
    setInputValue('#vmImmersionAngle', tool?.immersion_angle ?? '')
    setInputValue('#vmCutterLength', tool?.cutter_length ?? '')
    setInputValue('#vmOverallLength', tool?.overall_length ?? '')
    const title = document.querySelector('[data-tool-preview-title]')
    if (title) title.textContent = toolTitleText(toolSelect.value)
    const summary = document.querySelector('[data-tool-summary]')
    if (summary) summary.textContent = toolSummaryText(currentToolParamsFromDialog())
    renderVirtualDialogPreviews()
  })

  workpiecePresetSelect?.addEventListener('change', () => {
    const workpiece = defaultWorkpieceParams(workpiecePresetSelect.value)
    setInputValue('#vmLength', workpiece.length)
    setInputValue('#vmHeight', workpiece.height)
    setInputValue('#vmThickness', workpiece.thickness)
    setInputValue('#vmBaseWidth', workpiece.base_width)
    setInputValue('#vmBaseHeight', workpiece.base_height)
    const dimensions = parseWorkpieceDimensionsFromDialog()
    const summary = document.querySelector('[data-preview-summary]')
    if (summary) summary.textContent = dimensions ? workpieceSummaryText(dimensions) : t('field.unknown')
    const geometrySummary = document.querySelector('[data-geometry-summary]')
    if (geometrySummary) geometrySummary.textContent = dimensions ? workpieceSummaryText(dimensions) : t('field.unknown')
    renderVirtualDialogPreviews()
  })

  workpieceSourceMode?.addEventListener('change', () => {
    updateWorkpieceSourcePanels()
    renderVirtualDialogPreviews()
  })
  geometryArtifactSelect?.addEventListener('change', () => {
    const artifact = (state.workflowState.geometry_artifacts ?? [])
      .find((item) => item.artifact_id === geometryArtifactSelect.value)
    const fileName = document.querySelector('#vmGeometryArtifactFileName')
    if (fileName) fileName.textContent = artifact?.data_ref?.imported_file_name ?? artifact?.artifact_id ?? t('files.unselected')
  })

  importGeometryArtifactButton?.addEventListener('click', () => geometryArtifactFile?.click())
  geometryArtifactFile?.addEventListener('change', async () => {
    const file = geometryArtifactFile.files?.[0]
    if (!file) return
    await importTriDexelArtifactFromFile(geometryArtifactFile, { targetNode: node })
  })

  importButton?.addEventListener('click', () => stiffnessFile?.click())
  stiffnessFile?.addEventListener('change', async () => {
    const file = stiffnessFile.files?.[0]
    if (!file) return
    try {
      const text = await readTextFile(file)
      const points = parseStiffnessKeyPoints(text)
      setInputValue('#vmKeyPoints', JSON.stringify(points, null, 2))
      const fileName = document.querySelector('#vmStiffnessFileName')
      const pointCount = document.querySelector('#vmStiffnessPointCount')
      if (fileName) fileName.textContent = file.name
      if (pointCount) pointCount.textContent = `${points.length} ${t('field.points')}`
      node.params.stiffness_file_name = file.name
    } catch (error) {
      setStatus(errorMessage(error, 'stiffness import failed'), 'error')
    } finally {
      stiffnessFile.value = ''
    }
  })

  importToolpathButton?.addEventListener('click', () => toolpathFile?.click())
  toolpathFile?.addEventListener('change', async () => {
    const file = toolpathFile.files?.[0]
    if (!file) return
    try {
      const text = await readTextFile(file)
      const toolpath = parseToolpathText(text)
      setInputValue('#vmToolpathJson', JSON.stringify(toolpath, null, 2))
      const fileName = document.querySelector('#vmToolpathFileName')
      if (fileName) fileName.textContent = file.name
      node.params.toolpath = toolpath
      node.params.toolpath_file_name = file.name
    } catch (error) {
      setStatus(errorMessage(error, 'toolpath import failed'), 'error')
    } finally {
      toolpathFile.value = ''
    }
  })

  dimensionInputs.forEach((input) => {
    input.addEventListener('input', () => {
      const dimensions = parseWorkpieceDimensionsFromDialog()
      const summary = document.querySelector('[data-preview-summary]')
      if (summary) summary.textContent = dimensions ? workpieceSummaryText(dimensions) : t('field.unknown')
      const geometrySummary = document.querySelector('[data-geometry-summary]')
      if (geometrySummary) geometrySummary.textContent = dimensions ? workpieceSummaryText(dimensions) : t('field.unknown')
      renderVirtualDialogPreviews()
    })
  })

  processInputs.forEach((input) => {
    input.addEventListener('input', () => {
      const summary = document.querySelector('[data-process-summary]')
      if (summary) summary.textContent = processSummaryText(currentProcessParamsFromDialog())
    })
  })

  document.querySelector('#vmCuttingMode')?.addEventListener('change', () => {
    const summary = document.querySelector('[data-process-summary]')
    if (summary) summary.textContent = processSummaryText(currentProcessParamsFromDialog())
  })

  toolInputs.forEach((input) => {
    input.addEventListener('input', () => {
      const summary = document.querySelector('[data-tool-summary]')
      if (summary) summary.textContent = toolSummaryText(currentToolParamsFromDialog())
      renderVirtualDialogPreviews()
    })
  })
}

function bindVirtualTabs() {
  const buttons = [...elements.dialogBody.querySelectorAll('[data-virtual-tab]')]
  const panels = [...elements.dialogBody.querySelectorAll('[data-virtual-panel]')]
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.virtualTab
      buttons.forEach((item) => item.classList.toggle('active', item === button))
      panels.forEach((panel) => panel.classList.toggle('active', panel.dataset.virtualPanel === target))
      updateVirtualPreviewPanel(target)
    })
  })
}

function updateVirtualPreviewPanel(activePanel = null) {
  const target = activePanel ?? document.querySelector('[data-virtual-tab].active')?.dataset.virtualTab ?? 'geometry'
  document.querySelectorAll('[data-preview-panel-for]').forEach((panel) => {
    const panelNames = String(panel.dataset.previewPanelFor ?? '')
      .split(/\s+/)
      .filter(Boolean)
    panel.hidden = !panelNames.includes(target)
  })
}

function bindCanvasOrbit(canvas, rotation, render) {
  if (!canvas) return
  let dragging = false
  let startX = 0
  let startY = 0
  let startRx = rotation.rx
  let startRz = rotation.rz

  canvas.addEventListener('pointerdown', (event) => {
    dragging = true
    startX = event.clientX
    startY = event.clientY
    startRx = rotation.rx
    startRz = rotation.rz
    canvas.setPointerCapture?.(event.pointerId)
  })
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return
    rotation.rx = clamp(startRx - (event.clientY - startY) * 0.01, -1.15, 0.2)
    rotation.rz = startRz + (event.clientX - startX) * 0.01
    render()
  })
  const stop = (event) => {
    dragging = false
    canvas.releasePointerCapture?.(event.pointerId)
  }
  canvas.addEventListener('pointerup', stop)
  canvas.addEventListener('pointercancel', stop)
}

function setInputValue(selector, value) {
  const input = document.querySelector(selector)
  if (input) input.value = value
}

function updateWorkpieceSourcePanels() {
  const mode = document.querySelector('#vmWorkpieceSourceMode')?.value ?? 'parametric'
  document.querySelectorAll('[data-workpiece-source-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.workpieceSourcePanel !== mode
  })
}

function parseWorkpieceDimensionsFromDialog() {
  const values = {
    baseHeight: numberValue(valueFromInput('#vmBaseHeight', ''), NaN),
    baseWidth: numberValue(valueFromInput('#vmBaseWidth', ''), NaN),
    height: numberValue(valueFromInput('#vmHeight', ''), NaN),
    length: numberValue(valueFromInput('#vmLength', ''), NaN),
    thickness: numberValue(valueFromInput('#vmThickness', ''), NaN),
  }
  if (!Object.values(values).every((value) => Number.isFinite(value) && value > 0)) return null
  if (values.baseHeight >= values.height) return null
  return { ...values, wallHeight: values.height - values.baseHeight }
}

function parseWorkpieceDimensionsFromParams(params) {
  const values = {
    baseHeight: numberValue(params.workpiece.base_height, NaN),
    baseWidth: numberValue(params.workpiece.base_width, NaN),
    height: numberValue(params.workpiece.height, NaN),
    length: numberValue(params.workpiece.length, NaN),
    thickness: numberValue(params.workpiece.thickness, NaN),
  }
  if (!Object.values(values).every((value) => Number.isFinite(value) && value > 0)) return null
  if (values.baseHeight >= values.height) return null
  return { ...values, wallHeight: values.height - values.baseHeight }
}

function workpieceSummaryText(dimensions) {
  return `L ${formatNumber(dimensions.length)} / W ${formatNumber(dimensions.baseWidth)} / H1 ${formatNumber(dimensions.height)} / t ${formatNumber(dimensions.thickness)}`
}

function fallbackWorkpieceDimensions() {
  return { baseHeight: 16, baseWidth: 64, height: 56, length: 120, thickness: 3, wallHeight: 40 }
}

function currentToolParamsFromDialog() {
  return {
    cutter_length: valueFromInput('#vmCutterLength', '10'),
    diameter: valueFromInput('#vmDiameter', '4.0'),
    helix_angle: valueFromInput('#vmHelixAngle', '30'),
    immersion_angle: valueFromInput('#vmImmersionAngle', '90'),
    overall_length: valueFromInput('#vmOverallLength', '32'),
    teeth: valueFromInput('#vmTeeth', '2'),
    type: valueFromInput('#vmToolType', 'flat_end_mill'),
  }
}

function currentProcessParamsFromDialog() {
  return {
    axial_depth: valueFromInput('#vmAxialDepth', '10'),
    cutting_mode: document.querySelector('#vmCuttingMode')?.value ?? 'down_milling',
    design_surface_thickness: valueFromInput('#vmDesignSurfaceThickness', ''),
    feed_rate: valueFromInput('#vmFeedRate', '48'),
    radial_depth: valueFromInput('#vmRadialDepth', '1.0'),
    spindle_speed: valueFromInput('#vmSpindleSpeed', '7200'),
  }
}

function workpieceSourceFromDialog(node) {
  const mode = document.querySelector('#vmWorkpieceSourceMode')?.value
    ?? node.params?.workpiece_source?.mode
    ?? 'parametric'
  if (mode === 'file') {
    const artifactId = document.querySelector('#vmGeometryArtifactSelect')?.value
      ?? node.params?.workpiece_source?.geometry_artifact_id
      ?? null
    const artifact = (state.workflowState.geometry_artifacts ?? [])
      .find((item) => item.artifact_id === artifactId)
    return {
      file_name: node.params?.workpiece_source?.file_name ?? artifact?.data_ref?.imported_file_name ?? null,
      geometry_artifact_id: artifactId || null,
      mode,
      upstream_virtual_node_id: null,
    }
  }
  if (mode === 'upstream_node') {
    return {
      file_name: null,
      geometry_artifact_id: null,
      mode,
      upstream_virtual_node_id: document.querySelector('#vmUpstreamVirtualNode')?.value || null,
    }
  }
  return {
    file_name: null,
    geometry_artifact_id: null,
    mode: 'parametric',
    upstream_virtual_node_id: null,
  }
}

function toolSummaryText(tool) {
  return `D ${formatNumber(tool.diameter)} / Z ${tool.teeth || '--'} / L1 ${formatNumber(tool.cutter_length)}`
}

function processSummaryText(process) {
  return `n ${process.spindle_speed || '--'} / F ${process.feed_rate || '--'} / ae ${process.radial_depth || '--'}`
}

function toolTitleText(toolId) {
  return TOOL_LIBRARY.find((tool) => tool.id === toolId)?.label ?? t('files.unselected')
}

function renderVirtualDialogPreviews() {
  renderWorkpieceThreePreview(document.querySelector('#vmWorkpiecePreview'), parseWorkpieceDimensionsFromDialog() ?? fallbackWorkpieceDimensions())
  renderToolImagePreview(document.querySelector('#vmToolPreviewImage'), currentToolParamsFromDialog())
}

function renderToolImagePreview(image, tool) {
  if (!image) return
  const toolId = document.querySelector('#vmToolSelect')?.value || tool.type
  const title = toolTitleText(toolId)
  image.src = toolImageUrl(toolId)
  image.alt = title
  const details = document.querySelector('[data-tool-preview-details]')
  if (details) details.innerHTML = toolPreviewDetailsHtml(tool)
}

function toolImageUrl(toolId) {
  const tool = TOOL_LIBRARY.find((item) => item.id === toolId)
  if (tool?.imageUrl) return tool.imageUrl
  return './tool-library/flat-end-mill.png'
}

function toolPreviewDetailsHtml(tool) {
  return `
    <dt>${escapeHtml(t('param.diameter'))}</dt><dd>${escapeHtml(formatNumber(tool.diameter))} mm</dd>
    <dt>${escapeHtml(t('param.teeth'))}</dt><dd>${escapeHtml(tool.teeth || '--')}</dd>
    <dt>L1 / L2</dt><dd>${escapeHtml(formatNumber(tool.cutter_length))} / ${escapeHtml(formatNumber(tool.overall_length))} mm</dd>
  `
}

function renderWorkpieceThreePreview(mount, dimensions) {
  if (!mount) return
  if (!activeWorkpiecePreview || activeWorkpiecePreview.mount !== mount) {
    disposeActiveWorkpiecePreview()
    activeWorkpiecePreview = createWorkpieceThreePreview(mount)
  }
  updateWorkpieceThreePreview(activeWorkpiecePreview, dimensions)
}

function createWorkpieceThreePreview(mount) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#f5f8fa')
  scene.up.set(0, 0, 1)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  Object.assign(renderer.domElement.style, {
    cursor: 'grab',
    display: 'block',
    height: '100%',
    inset: '0',
    outline: 'none',
    position: 'absolute',
    touchAction: 'none',
    width: '100%',
  })
  mount.appendChild(renderer.domElement)

  const camera = new THREE.PerspectiveCamera(38, 4 / 3, 0.1, 5000)
  camera.up.set(0, 0, 1)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.enablePan = false
  controls.enableRotate = true
  controls.enableZoom = true
  controls.dampingFactor = 0.08
  controls.rotateSpeed = 0.72

  renderer.domElement.addEventListener('pointerdown', () => {
    renderer.domElement.style.cursor = 'grabbing'
  })
  renderer.domElement.addEventListener('pointerup', () => {
    renderer.domElement.style.cursor = 'grab'
  })
  renderer.domElement.addEventListener('pointercancel', () => {
    renderer.domElement.style.cursor = 'grab'
  })

  scene.add(new THREE.HemisphereLight('#ffffff', '#9aa9b5', 1.7))
  const keyLight = new THREE.DirectionalLight('#ffffff', 2.1)
  scene.add(keyLight)

  const modelGroup = new THREE.Group()
  const guideGroup = new THREE.Group()
  scene.add(modelGroup)
  scene.add(guideGroup)

  const resize = () => {
    const width = Math.max(1, mount.clientWidth)
    const height = Math.max(1, mount.clientHeight)
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(mount)
  resize()

  let frame = 0
  const animate = () => {
    controls.update()
    renderer.render(scene, camera)
    frame = window.requestAnimationFrame(animate)
  }
  animate()

  return { camera, controls, frame, guideGroup, keyLight, modelGroup, mount, observer, renderer, scene }
}

function updateWorkpieceThreePreview(preview, dimensions) {
  clearThreeGroup(preview.modelGroup)
  clearThreeGroup(preview.guideGroup)

  const span = Math.max(dimensions.length, dimensions.baseWidth, dimensions.height)
  preview.camera.far = span * 20
  preview.camera.position.set(dimensions.length * 0.76, span * 0.9, dimensions.height * 0.8 + span * 0.2)
  preview.camera.updateProjectionMatrix()
  preview.controls.target.set(dimensions.length / 2, 0, dimensions.height / 2)
  preview.controls.update()
  preview.keyLight.position.set(-span * 0.25, span * 0.7, span)

  const bodyMaterial = new THREE.MeshStandardMaterial({ color: '#8fa4b3', metalness: 0.06, roughness: 0.54 })
  const wallMaterial = new THREE.MeshStandardMaterial({ color: '#b7c4cc', metalness: 0.04, roughness: 0.5 })
  const edgeMaterial = new THREE.LineBasicMaterial({ color: '#536b7a', transparent: true, opacity: 0.72 })

  addWorkpieceBox(
    preview.modelGroup,
    [dimensions.length, dimensions.baseWidth, dimensions.baseHeight],
    [dimensions.length / 2, 0, dimensions.baseHeight / 2],
    bodyMaterial,
    edgeMaterial,
  )
  addWorkpieceBox(
    preview.modelGroup,
    [dimensions.length, dimensions.thickness, dimensions.wallHeight],
    [dimensions.length / 2, 0, dimensions.baseHeight + dimensions.wallHeight / 2],
    wallMaterial,
    edgeMaterial,
  )
  addWorkpieceDimensionGuides(preview.guideGroup, dimensions, span)
}

function addWorkpieceBox(group, size, position, material, edgeMaterial) {
  const geometry = new THREE.BoxGeometry(size[0], size[1], size[2])
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(position[0], position[1], position[2])
  mesh.castShadow = true
  mesh.receiveShadow = true
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), edgeMaterial)
  mesh.add(edges)
  group.add(mesh)
}

function addWorkpieceDimensionGuides(group, dimensions, span) {
  const gap = Math.max(5, span * 0.085)
  const lineMaterial = new THREE.LineBasicMaterial({ color: '#174457', transparent: true, opacity: 0.82, depthTest: false })
  const leaderMaterial = new THREE.LineBasicMaterial({ color: '#174457', transparent: true, opacity: 0.46, depthTest: false })
  const headMaterial = new THREE.MeshBasicMaterial({ color: '#174457', transparent: true, opacity: 0.9, depthTest: false })

  const lengthStart = new THREE.Vector3(0, -dimensions.baseWidth / 2 - gap, dimensions.baseHeight * 0.45)
  const lengthEnd = new THREE.Vector3(dimensions.length, -dimensions.baseWidth / 2 - gap, dimensions.baseHeight * 0.45)
  const widthStart = new THREE.Vector3(-gap * 0.65, -dimensions.baseWidth / 2, dimensions.baseHeight * 0.65)
  const widthEnd = new THREE.Vector3(-gap * 0.65, dimensions.baseWidth / 2, dimensions.baseHeight * 0.65)
  const heightStart = new THREE.Vector3(dimensions.length + gap, dimensions.baseWidth / 2 + gap * 0.35, 0)
  const heightEnd = new THREE.Vector3(dimensions.length + gap, dimensions.baseWidth / 2 + gap * 0.35, dimensions.height)
  const baseHeightStart = new THREE.Vector3(dimensions.length + gap * 0.5, -dimensions.baseWidth / 2 - gap * 0.35, 0)
  const baseHeightEnd = new THREE.Vector3(dimensions.length + gap * 0.5, -dimensions.baseWidth / 2 - gap * 0.35, dimensions.baseHeight)

  addLeaderLine3d(group, new THREE.Vector3(0, -dimensions.baseWidth / 2, dimensions.baseHeight * 0.45), lengthStart, leaderMaterial)
  addLeaderLine3d(group, new THREE.Vector3(dimensions.length, -dimensions.baseWidth / 2, dimensions.baseHeight * 0.45), lengthEnd, leaderMaterial)
  addLeaderLine3d(group, new THREE.Vector3(0, -dimensions.baseWidth / 2, dimensions.baseHeight * 0.65), widthStart, leaderMaterial)
  addLeaderLine3d(group, new THREE.Vector3(0, dimensions.baseWidth / 2, dimensions.baseHeight * 0.65), widthEnd, leaderMaterial)
  addLeaderLine3d(group, new THREE.Vector3(dimensions.length, dimensions.baseWidth / 2, 0), heightStart, leaderMaterial)
  addLeaderLine3d(group, new THREE.Vector3(dimensions.length, dimensions.baseWidth / 2, dimensions.height), heightEnd, leaderMaterial)
  addLeaderLine3d(group, new THREE.Vector3(dimensions.length, -dimensions.baseWidth / 2, 0), baseHeightStart, leaderMaterial)
  addLeaderLine3d(group, new THREE.Vector3(dimensions.length, -dimensions.baseWidth / 2, dimensions.baseHeight), baseHeightEnd, leaderMaterial)

  addOutwardDimensionLine3d(group, lengthStart, lengthEnd, span, lineMaterial, headMaterial)
  addOutwardDimensionLine3d(group, widthStart, widthEnd, span, lineMaterial, headMaterial)
  addOutwardDimensionLine3d(group, heightStart, heightEnd, span, lineMaterial, headMaterial)
  addOutwardDimensionLine3d(group, baseHeightStart, baseHeightEnd, span, lineMaterial, headMaterial)

  const thicknessZ = dimensions.baseHeight + dimensions.wallHeight * 0.66
  const thicknessX = dimensions.length * 0.6
  const halfThickness = dimensions.thickness / 2
  addLeaderLine3d(group, new THREE.Vector3(thicknessX, halfThickness, thicknessZ), new THREE.Vector3(thicknessX, halfThickness + gap * 0.18, thicknessZ), leaderMaterial)
  addLeaderLine3d(group, new THREE.Vector3(thicknessX, -halfThickness, thicknessZ), new THREE.Vector3(thicknessX, -halfThickness - gap * 0.18, thicknessZ), leaderMaterial)
  addOneWayArrow3d(group, new THREE.Vector3(thicknessX, halfThickness + gap * 0.72, thicknessZ), new THREE.Vector3(thicknessX, halfThickness, thicknessZ), span, lineMaterial, headMaterial)
  addOneWayArrow3d(group, new THREE.Vector3(thicknessX, -halfThickness - gap * 0.72, thicknessZ), new THREE.Vector3(thicknessX, -halfThickness, thicknessZ), span, lineMaterial, headMaterial)

  ;[
    ['L', lengthStart.clone().lerp(lengthEnd, 0.5).add(new THREE.Vector3(0, -gap * 0.34, 0))],
    ['W', widthStart.clone().lerp(widthEnd, 0.5).add(new THREE.Vector3(-gap * 0.34, 0, 0))],
    ['H1', heightStart.clone().lerp(heightEnd, 0.5).add(new THREE.Vector3(gap * 0.34, 0, 0))],
    ['H2', baseHeightStart.clone().lerp(baseHeightEnd, 0.5).add(new THREE.Vector3(gap * 0.34, 0, 0))],
    ['t', new THREE.Vector3(thicknessX, 0, thicknessZ + gap * 0.36)],
  ].forEach(([text, position]) => {
    const label = createDimensionLabel(text, span)
    label.position.copy(position)
    group.add(label)
  })
}

function addLine3d(group, start, end, material) {
  const geometry = new THREE.BufferGeometry().setFromPoints([start, end])
  const line = new THREE.Line(geometry, material)
  line.renderOrder = 18
  group.add(line)
}

function addLeaderLine3d(group, anchor, dimensionPoint, material) {
  addLine3d(group, anchor, dimensionPoint, material)
}

function addArrowHead3d(group, tip, direction, span, material) {
  if (direction.lengthSq() < 1e-10) return
  const unit = direction.clone().normalize()
  const headLength = Math.max(1.8, span * 0.032)
  const headWidth = Math.max(0.85, span * 0.015)
  const cone = new THREE.Mesh(new THREE.ConeGeometry(headWidth, headLength, 24), material)
  cone.position.copy(tip).addScaledVector(unit, -headLength * 0.5)
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), unit)
  cone.renderOrder = 19
  group.add(cone)
}

function addOutwardDimensionLine3d(group, start, end, span, lineMaterial, headMaterial) {
  addLine3d(group, start, end, lineMaterial)
  const center = start.clone().lerp(end, 0.5)
  addArrowHead3d(group, start, start.clone().sub(center), span, headMaterial)
  addArrowHead3d(group, end, end.clone().sub(center), span, headMaterial)
}

function addOneWayArrow3d(group, start, end, span, lineMaterial, headMaterial) {
  addLine3d(group, start, end, lineMaterial)
  addArrowHead3d(group, end, end.clone().sub(start), span, headMaterial)
}

function createDimensionLabel(text, span) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = 'rgba(255,255,255,0.86)'
    context.strokeStyle = 'rgba(16,38,56,0.22)'
    context.lineWidth = 4
    roundedRect(context, 50, 22, 156, 84, 24)
    context.fill()
    context.stroke()
    context.fillStyle = '#102638'
    context.font = '800 56px "Microsoft YaHei", Arial, sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(text, canvas.width / 2, canvas.height / 2 + 1)
  }
  const texture = new THREE.CanvasTexture(canvas)
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false }))
  const labelHeight = Math.max(5.2, span * 0.085)
  sprite.scale.set(labelHeight * 2.1, labelHeight, 1)
  sprite.renderOrder = 20
  return sprite
}

function clearThreeGroup(group) {
  while (group.children.length) {
    const child = group.children[0]
    group.remove(child)
    disposeThreeObject(child)
  }
}

function disposeThreeObject(object) {
  if (!object) return
  object.traverse?.((child) => {
    child.geometry?.dispose?.()
    const materials = Array.isArray(child.material) ? child.material : child.material ? [child.material] : []
    materials.forEach((material) => {
      material.map?.dispose?.()
      material.dispose?.()
    })
  })
}

function disposeActiveWorkpiecePreview() {
  if (!activeWorkpiecePreview) return
  window.cancelAnimationFrame(activeWorkpiecePreview.frame)
  activeWorkpiecePreview.observer.disconnect()
  activeWorkpiecePreview.controls.dispose()
  disposeThreeObject(activeWorkpiecePreview.scene)
  activeWorkpiecePreview.renderer.dispose()
  activeWorkpiecePreview.renderer.domElement.remove()
  activeWorkpiecePreview = null
}

function drawWorkpiecePreviewCanvas(canvas, dimensions, rotation) {
  const context = prepareCanvas(canvas)
  if (!context) return
  const { ctx, height, width } = context
  drawCanvasBackground(ctx, width, height)
  const boxes = [
    {
      color: '#8fa4b3',
      max: [dimensions.length / 2, dimensions.baseWidth / 2, dimensions.baseHeight / 2],
      min: [-dimensions.length / 2, -dimensions.baseWidth / 2, -dimensions.baseHeight / 2],
    },
    {
      color: '#b7c4cc',
      max: [dimensions.length / 2, dimensions.thickness / 2, dimensions.baseHeight / 2 + dimensions.wallHeight],
      min: [-dimensions.length / 2, -dimensions.thickness / 2, dimensions.baseHeight / 2],
    },
  ]
  const span = Math.max(dimensions.length, dimensions.baseWidth, dimensions.height)
  const scale = Math.min(width * 0.58, height * 0.62) / span
  const faces = boxes.flatMap((box) => boxFaces(box, rotation, scale, width, height))
  faces.sort((a, b) => a.depth - b.depth)
  faces.forEach((face) => drawFace(ctx, face))
  drawPreviewLabel(ctx, 'L', width * 0.48, height * 0.86)
  drawPreviewLabel(ctx, 'W', width * 0.17, height * 0.63)
  drawPreviewLabel(ctx, 'H1', width * 0.81, height * 0.34)
  drawPreviewLabel(ctx, 'H2', width * 0.78, height * 0.68)
  drawPreviewLabel(ctx, 't', width * 0.55, height * 0.34)
}

function drawToolPreviewCanvas(canvas, tool, rotation) {
  const context = prepareCanvas(canvas)
  if (!context) return
  const { ctx, height, width } = context
  drawCanvasBackground(ctx, width, height)
  const diameter = Math.max(2, numberValue(tool.diameter, 4))
  const cutter = Math.max(6, numberValue(tool.cutter_length, 10))
  const overall = Math.max(cutter + 8, numberValue(tool.overall_length, 32))
  const radius = diameter / 2
  const scale = Math.min(width * 0.52 / Math.max(diameter * 3, 14), height * 0.74 / overall)
  const segments = 32
  const topZ = overall / 2
  const cutterTop = topZ - cutter
  const points = []
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    points.push({
      bottom: project3d([x, y, -overall / 2], rotation, scale, width, height),
      cutterTop: project3d([x, y, cutterTop], rotation, scale, width, height),
      top: project3d([x, y, topZ], rotation, scale, width, height),
      shade: 0.68 + Math.cos(angle - rotation.rz) * 0.18,
    })
  }
  for (let i = 0; i < segments; i += 1) {
    const next = points[(i + 1) % segments]
    const current = points[i]
    drawPolygon(ctx, [current.top, next.top, next.cutterTop, current.cutterTop], shadeColor('#96a7b3', current.shade), '#536b7a')
    drawPolygon(ctx, [current.cutterTop, next.cutterTop, next.bottom, current.bottom], shadeColor('#6f8491', current.shade), '#425563')
  }
  for (let i = 0; i < 3; i += 1) {
    const start = project3d([Math.cos(i * 2.1) * radius * 0.92, Math.sin(i * 2.1) * radius * 0.92, cutterTop], rotation, scale, width, height)
    const end = project3d([Math.cos(i * 2.1 + 1.4) * radius * 0.92, Math.sin(i * 2.1 + 1.4) * radius * 0.92, -overall / 2], rotation, scale, width, height)
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.strokeStyle = 'rgba(29,95,145,0.55)'
    ctx.lineWidth = 2
    ctx.stroke()
  }
  drawPreviewLabel(ctx, `D ${formatNumber(diameter)}`, width * 0.24, height * 0.72)
  drawPreviewLabel(ctx, `L1 ${formatNumber(cutter)}`, width * 0.72, height * 0.62)
}

function prepareCanvas(canvas) {
  if (!canvas) return null
  const rect = canvas.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const width = Math.max(1, Math.round((rect.width || canvas.width) * dpr))
  const height = Math.max(1, Math.round((rect.height || canvas.height) * dpr))
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  return { ctx, height, width }
}

function drawCanvasBackground(ctx, width, height) {
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#f5f8fa'
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = '#e2e9f0'
  ctx.lineWidth = 1
  const step = 24
  for (let x = 0; x < width; x += step) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  for (let y = 0; y < height; y += step) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
}

function boxFaces(box, rotation, scale, width, height) {
  const [x0, y0, z0] = box.min
  const [x1, y1, z1] = box.max
  const vertices = [
    [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
    [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
  ].map((point) => project3d(point, rotation, scale, width, height))
  const faceIndices = [
    [0, 1, 2, 3, 0.72],
    [4, 5, 6, 7, 1.12],
    [0, 1, 5, 4, 0.88],
    [1, 2, 6, 5, 0.98],
    [2, 3, 7, 6, 0.82],
    [3, 0, 4, 7, 0.78],
  ]
  return faceIndices.map(([a, b, c, d, shade]) => {
    const points = [vertices[a], vertices[b], vertices[c], vertices[d]]
    return {
      color: shadeColor(box.color, shade),
      depth: average(points.map((point) => point.depth)) ?? 0,
      points,
      stroke: '#536b7a',
    }
  })
}

function project3d(point, rotation, scale, width, height) {
  let [x, y, z] = point
  const cosZ = Math.cos(rotation.rz)
  const sinZ = Math.sin(rotation.rz)
  const zx = x * cosZ - y * sinZ
  const zy = x * sinZ + y * cosZ
  x = zx
  y = zy
  const cosX = Math.cos(rotation.rx)
  const sinX = Math.sin(rotation.rx)
  const yy = y * cosX - z * sinX
  const zz = y * sinX + z * cosX
  const distance = 600
  const perspective = distance / (distance + zz)
  return {
    depth: zz,
    x: width / 2 + x * scale * perspective,
    y: height * 0.56 - yy * scale * perspective,
  }
}

function drawFace(ctx, face) {
  drawPolygon(ctx, face.points, face.color, face.stroke)
}

function drawPolygon(ctx, points, fill, stroke) {
  ctx.beginPath()
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y)
    else ctx.lineTo(point.x, point.y)
  })
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = 1.2
  ctx.stroke()
}

function drawPreviewLabel(ctx, text, x, y) {
  ctx.save()
  ctx.font = '800 12px "Microsoft YaHei", Arial, sans-serif'
  const width = ctx.measureText(text).width + 14
  ctx.fillStyle = 'rgba(255,255,255,0.88)'
  ctx.strokeStyle = 'rgba(23,68,87,0.22)'
  roundedRect(ctx, x - width / 2, y - 11, width, 22, 11)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#173f56'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y + 0.5)
  ctx.restore()
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
}

function shadeColor(hex, factor) {
  const normalized = hex.replace('#', '')
  const channels = [0, 2, 4].map((start) => Number.parseInt(normalized.slice(start, start + 2), 16))
  return `rgb(${channels.map((value) => clamp(Math.round(value * factor), 0, 255)).join(', ')})`
}

function sampleRatioLabel(value) {
  if (value === '0.5') return t('param.half')
  if (value === '0.25') return t('param.quarter')
  return t('param.full')
}

function outputTypeLabel(type) {
  if (type === 'wall_error') return t('node.wtcInputMeta')
  if (type === 'compensation_plan') return t('node.wtcOutputMeta')
  if (type === 'pose') return t('result.pose')
  if (type === 'point_cloud_pair') return t('node.inputMeta')
  return type ?? t('field.unknown')
}

function registrationSampleSize(node) {
  if (node.params.sample_ratio === 'full') return '0'
  const input = groupInput(node.groupId)
  const ratio = Number(node.params.sample_ratio)
  const sourcePoints = Number(input?.geometry?.source?.points)
  const targetPoints = Number(input?.geometry?.target?.points)
  if (!Number.isFinite(ratio) || !Number.isFinite(sourcePoints) || !Number.isFinite(targetPoints)) return '0'
  return String(Math.max(1, Math.floor(Math.min(sourcePoints, targetPoints) * ratio)))
}

function pointsPreviewText(points) {
  if (!points.length) return t('result.empty')
  const first = points[0]
  return `${first.id ?? 'point'} (${formatNumber(first.x)}, ${formatNumber(first.y)}, ${formatNumber(first.z)})`
}

function boundsFromErrorPoints(points) {
  return points.reduce((bounds, point) => {
    const vector = [Number(point.x), Number(point.y), Number(point.z)]
    return vector.every(Number.isFinite) ? extendBounds(bounds, vector) : bounds
  }, null)
}

function extendBounds(bounds, point) {
  if (!bounds) return { min: [...point], max: [...point] }
  return {
    min: bounds.min.map((value, index) => Math.min(value, point[index])),
    max: bounds.max.map((value, index) => Math.max(value, point[index])),
  }
}

function average(values) {
  const numeric = values.map(Number).filter(Number.isFinite)
  if (!numeric.length) return null
  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length
}

function poseSummaryHtml(pose) {
  if (!pose) return `<p class="muted">${escapeHtml(t('result.empty'))}</p>`
  const translation = pose.translation_xyz ?? [0, 0, 0]
  const angles = pose.angles_xyz_degrees ?? [0, 0, 0]
  const rows = [
    ['X', translation[0], ''],
    ['Y', translation[1], ''],
    ['Z', translation[2], ''],
    ['Rx', angles[0], 'deg'],
    ['Ry', angles[1], 'deg'],
    ['Rz', angles[2], 'deg'],
  ]
  return `
    <div class="metric-grid">
      ${rows.map(([label, value, unit]) => `
        <div class="metric">
          <span>${label}</span>
          <strong>${escapeHtml(formatNumber(value))}${unit ? ` ${unit}` : ''}</strong>
        </div>
      `).join('')}
    </div>
  `
}

function matrixHtml(matrix) {
  if (!Array.isArray(matrix)) return `<p class="muted">${escapeHtml(t('result.empty'))}</p>`
  return `
    <table class="matrix-table">
      ${matrix.map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(formatNumber(value))}</td>`).join('')}</tr>`).join('')}
    </table>
  `
}

function poseFromTransform(transform) {
  if (!Array.isArray(transform) || transform.length < 4) return null
  const rotation = transform.slice(0, 3).map((row) => row.slice(0, 3))
  const translation = transform.slice(0, 3).map((row) => row[3] ?? 0)
  const sy = Math.hypot(rotation[0][0], rotation[1][0])
  let roll
  let pitch
  let yaw
  if (sy > 1e-9) {
    roll = Math.atan2(rotation[2][1], rotation[2][2])
    pitch = Math.atan2(-rotation[2][0], sy)
    yaw = Math.atan2(rotation[1][0], rotation[0][0])
  } else {
    roll = Math.atan2(-rotation[1][2], rotation[1][1])
    pitch = Math.atan2(-rotation[2][0], sy)
    yaw = 0
  }
  return {
    angles_xyz_degrees: [roll, pitch, yaw].map((value) => (value * 180) / Math.PI),
    angles_xyz_radians: [roll, pitch, yaw],
    rotation_matrix: rotation,
    translation_xyz: translation,
  }
}

function compactWorkflowBody(body) {
  const cloneBody = clone(body)
  const result = cloneBody.result
  if (result && typeof result === 'object') {
    ;['transformed_source_points', 'target_points', 'signed_deviations'].forEach((key) => {
      if (Array.isArray(result[key])) result[key] = `[${result[key].length} rows omitted in platform view]`
    })
  }
  return cloneBody
}

function formatNumber(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '--'
  if (Math.abs(numeric) >= 100) return numeric.toFixed(2)
  if (Math.abs(numeric) >= 1) return numeric.toFixed(4)
  if (numeric === 0) return '0'
  return numeric.toPrecision(4)
}

function formatStiffnessAverageValue(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return ''
  return String(Number(numeric.toPrecision(12)))
}

function formatParameterValue(value, fallback = '--') {
  if (value == null || value === '') return fallback
  const numeric = Number(value)
  return Number.isFinite(numeric) ? formatNumber(numeric) : String(value)
}

function formatCount(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric.toLocaleString() : t('field.unknown')
}

function formatBounds(bounds) {
  if (!bounds) return t('field.unknown')
  const min = bounds.min.map(formatNumber).join(', ')
  const max = bounds.max.map(formatNumber).join(', ')
  return `min [${min}] / max [${max}]`
}

function numberOrNull(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function numberValue(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function positiveNumber(value, label) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label} must be a positive number.`)
  return parsed
}

function integerValue(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function valueFromInput(selector, fallback) {
  const value = document.querySelector(selector)?.value?.trim()
  return value || fallback
}

function normalizeApiBase(value) {
  return String(value ?? '').replace(/\/$/, '')
}

function setStatus(message, tone) {
  elements.graphStatus.textContent = message
  document.body.dataset.status = tone
}

function showNodeMenu(x, y) {
  elements.nodeMenu.style.left = `${x}px`
  elements.nodeMenu.style.top = `${y}px`
  elements.nodeMenu.classList.add('visible')
}

function hideNodeMenu() {
  elements.nodeMenu.classList.remove('visible')
}

function errorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback
}

function defaultApiBase() {
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:'
  const host = window.location.hostname || 'localhost'
  return `${protocol}//${host}/api/process-a`
}

function defaultStandaloneUrl() {
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:'
  const host = window.location.hostname || 'localhost'
  return `${protocol}//${host}/`
}

function defaultWallCompensationApiBase() {
  return '/api/wall-thickness-compensation'
}

function defaultWallCompensationStandaloneUrl() {
  return defaultLegacyCompensationStandaloneUrl()
}

function defaultVirtualMachiningApiBase() {
  return '/api/virtual-machining'
}

function defaultLegacyCompensationStandaloneUrl() {
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:'
  const host = window.location.hostname || 'localhost'
  return `${protocol}//${host}:18080/`
}

function defaultWallErrorPoints() {
  return [
    { id: 'K1_J1_I1', x: 0, y: 56, z: 60, stiffness: 1200, error: 0.08 },
    { id: 'K1_J2_I1', x: 0, y: 36, z: 60, stiffness: 980, error: 0.11 },
    { id: 'K1_J3_I1', x: 0, y: 16, z: 60, stiffness: 860, error: 0.13 },
  ]
}

function defaultStiffnessPoints() {
  return defaultVirtualStiffnessPoints()
}

function defaultVirtualMachiningParameters() {
  return normalizeVirtualMachiningParams({
    key_points: JSON.stringify(defaultStiffnessPoints(), null, 2),
    material_id: '7075-T6',
    material: {
      density: '2.81',
      elasticModulus: '71.7',
      name: '7075-T6',
      poissonRatio: '0.33',
    },
    model_version: 'v1.0',
    process: {
      axial_depth: '10',
      cutting_mode: 'down_milling',
      feed_rate: '48',
      radial_depth: '1.0',
      spindle_speed: '7200',
    },
    stiffness_file_name: DEFAULT_STIFFNESS_FILE_NAME,
    stiffness_file_path_hint: DEFAULT_STIFFNESS_FILE_PATH,
    tool: {
      cutter_length: '10',
      diameter: '4.0',
      helix_angle: '30',
      immersion_angle: '90',
      overall_length: '32',
      teeth: '2',
      type: 'flat_end_mill',
    },
    tool_id: 'flat_end_mill',
    toolpath: null,
    toolpath_file_name: '',
    workpiece: defaultWorkpieceParams('default-thinwall'),
    workpiece_preset_id: 'default-thinwall',
  })
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}




