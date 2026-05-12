import { createVirtualMachiningWidget } from './virtualMachiningWidget.js'
import * as THREE from 'three'
import { OrbitControls } from './vendor/OrbitControls.js'

const translations = {
  zh: {
    'actions.addVirtual': '添加虚拟加工',
    'actions.clearLinks': '清空连线',
    'actions.close': '关闭',
    'actions.configure': '配置节点',
    'actions.deleteNode': '删除节点',
    'actions.import': '导入文件',
    'actions.load': '加载工艺',
    'actions.loadScene': '加载场景',
    'actions.loadVirtual': '加载 Unity',
    'actions.openApp': '打开独立 App',
    'actions.resetLayout': '整理画布',
    'actions.resetScene': '重置场景',
    'actions.run': '运行流程',
    'actions.save': '保存配置',
    'actions.previewCutting': '预览切削过程',
    'actions.sendToVirtual': '发送到虚拟加工',
    'canvas.label': '画布',
    'catalog.help': '拖拽到画布会自动补齐输入、工艺和输出节点。',
    'catalog.label': '工艺库',
    'catalog.title': '可用工艺 App',
    'dialog.fileHint': '选择 source/target 后，平台会读取模型格式、点数、法向与包围盒，便于确认输入对象。',
    'dialog.inputTitle': '配置输入节点',
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
    'mode.saved': '保存记录模式',
    'mode.stateless': '无状态模式',
    'node.input': '输入',
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
    'param.axialDepth': '轴向切深',
    'param.baseHeight': '底座高度',
    'param.baseWidth': '底座宽度',
    'param.compMethod': '补偿方法',
    'param.cuttingMode': '铣削方向',
    'param.density': '密度',
    'param.diameter': '刀具直径',
    'param.elasticModulus': '弹性模量',
    'param.errorPoints': '误差点 JSON',
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
    'param.modelVersion': '模型版本',
    'param.persist': '保存结果到独立 App 记录',
    'param.poissonRatio': '泊松比',
    'param.quarter': '1/4 采样',
    'param.radialDepth': '径向切深',
    'param.sampleRatio': '配准采样比例',
    'param.spindleSpeed': '主轴转速',
    'param.teeth': '齿数',
    'param.thickness': '壁厚',
    'param.toolLength': '刀刃长度',
    'param.toolOverall': '刀具总长',
    'param.toolType': '刀具类型',
    'param.workpiecePreview': '工件示意',
    'param.upperTol': 'Upper tol',
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
    'status.connecting': '请选择目标输入端口',
    'status.done': '执行成功',
    'status.geometry': '正在读取几何',
    'status.invalidLink': '端口类型不匹配',
    'status.linkCreated': '连线已建立',
    'status.linkFilled': '参数已由连线补齐',
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
    'virtual.tabGeometry': '工件/材料',
    'virtual.tabProcess': '工艺',
    'virtual.tabStiffness': '刚度',
    'virtual.tabTool': '刀具',
  },
  en: {
    'actions.addVirtual': 'Add Virtual Node',
    'actions.clearLinks': 'Clear Links',
    'actions.close': 'Close',
    'actions.configure': 'Configure Node',
    'actions.deleteNode': 'Delete Node',
    'actions.import': 'Import File',
    'actions.load': 'Load Process',
    'actions.loadScene': 'Load Scene',
    'actions.loadVirtual': 'Load Unity',
    'actions.openApp': 'Open App',
    'actions.resetLayout': 'Arrange',
    'actions.resetScene': 'Reset Scene',
    'actions.run': 'Run Workflow',
    'actions.save': 'Save',
    'actions.previewCutting': 'Preview Cutting',
    'actions.sendToVirtual': 'Preview Result',
    'canvas.label': 'Canvas',
    'catalog.help': 'Drag an app onto the canvas to add its input, process, and output nodes.',
    'catalog.label': 'Catalog',
    'catalog.title': 'Process Apps',
    'dialog.fileHint': 'After selecting source/target, the platform reads format, point count, normals, and bounding box so the input can be checked.',
    'dialog.inputTitle': 'Configure Input Node',
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
    'mode.saved': 'Saved Record Mode',
    'mode.stateless': 'Stateless Mode',
    'node.input': 'Input',
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
    'param.axialDepth': 'Axial Depth',
    'param.baseHeight': 'Base Height',
    'param.baseWidth': 'Base Width',
    'param.compMethod': 'Compensation Method',
    'param.cuttingMode': 'Cutting Mode',
    'param.density': 'Density',
    'param.diameter': 'Tool Diameter',
    'param.elasticModulus': 'Elastic Modulus',
    'param.errorPoints': 'Error Points JSON',
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
    'param.modelVersion': 'Model Version',
    'param.persist': 'Save result to standalone app records',
    'param.poissonRatio': 'Poisson Ratio',
    'param.quarter': '1/4 sampling',
    'param.radialDepth': 'Radial Depth',
    'param.sampleRatio': 'Registration sampling ratio',
    'param.spindleSpeed': 'Spindle Speed',
    'param.teeth': 'Teeth',
    'param.thickness': 'Wall Thickness',
    'param.toolLength': 'Cutter Length',
    'param.toolOverall': 'Overall Length',
    'param.toolType': 'Tool Type',
    'param.workpiecePreview': 'Workpiece Preview',
    'param.upperTol': 'Upper tol',
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
    'status.connecting': 'Choose a target input port',
    'status.done': 'Succeeded',
    'status.geometry': 'Reading geometry',
    'status.invalidLink': 'Port types do not match',
    'status.linkCreated': 'Link created',
    'status.linkFilled': 'Parameters filled from link',
    'status.loading': 'Loading manifest',
    'status.nodeAdded': 'Node added',
    'status.nodeDeleted': 'Node deleted',
    'status.noLinks': 'Connect nodes first',
    'status.noRunnable': 'No runnable nodes on the canvas',
    'status.ready': 'Ready',
    'status.running': 'Running',
    'status.saved': 'Configuration saved',
    'topbar.label': 'Public Workflow Platform',
    'topbar.title': 'Process Graph Canvas',
    'virtual.dockTitle': 'Unity Machining Scene',
    'virtual.label': 'Virtual Machining Platform',
    'virtual.statusIdle': 'Unity not loaded',
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
      error_points: JSON.stringify(defaultWallErrorPoints(), null, 2),
    },
  },
]

const state = {
  connectingFrom: null,
  edges: [],
  idCounter: 1,
  language: localStorage.getItem('workflow-language') || 'zh',
  lastResponse: null,
  nodes: [],
  selectedNodeId: null,
  virtualMachining: null,
}

let activeWorkpiecePreview = null

const elements = {
  addVirtualNode: document.querySelector('#addVirtualNode'),
  apiBase: document.querySelector('#apiBase'),
  clearLinks: document.querySelector('#clearLinks'),
  dialogBody: document.querySelector('#dialogBody'),
  dialogFooter: document.querySelector('#dialogFooter'),
  dialogKicker: document.querySelector('#dialogKicker'),
  dialogTitle: document.querySelector('#dialogTitle'),
  graphCanvas: document.querySelector('#graphCanvas'),
  graphStatus: document.querySelector('#graphStatus'),
  inspectorContent: document.querySelector('#inspectorContent'),
  inspectorTitle: document.querySelector('#inspectorTitle'),
  languageSelect: document.querySelector('#languageSelect'),
  loadManifest: document.querySelector('#loadManifest'),
  loadVirtualMachining: document.querySelector('#loadVirtualMachining'),
  loadVirtualScene: document.querySelector('#loadVirtualScene'),
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
  runWorkflow: document.querySelector('#runWorkflow'),
  sendVirtualResult: document.querySelector('#sendVirtualResult'),
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
  translate()
  renderCatalog()
  renderGraph()
  bindEvents()
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
  elements.runWorkflow.addEventListener('click', () => void runWorkflow())
  elements.openStandalone.addEventListener('click', openStandaloneApp)
  elements.openNodeConfig.addEventListener('click', openNodeDialog)
  elements.clearLinks.addEventListener('click', clearLinks)
  elements.resetLayout.addEventListener('click', resetLayout)
  elements.addVirtualNode.addEventListener('click', () => {
    addVirtualMachiningNode(90 + state.nodes.length * 18, 90 + state.nodes.length * 12)
    setStatus(t('status.nodeAdded'), 'done')
  })
  elements.loadVirtualMachining?.addEventListener('click', () => void state.virtualMachining.load())
  elements.loadVirtualScene?.addEventListener('click', () => void state.virtualMachining.loadScene())
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
    void runWorkflow()
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
  const nodesHtml = state.nodes
    .map((node) => {
      const spec = nodeSpec(node)
      const classes = [
        'node',
        `node-${node.type}`,
        state.selectedNodeId === node.id ? 'active' : '',
        state.connectingFrom === node.id ? 'connecting' : '',
      ].filter(Boolean).join(' ')
      return `
        <article class="${classes}" data-node="${node.id}" style="left:${node.x}px; top:${node.y}px">
          ${hasInputPort(node) ? `<button class="port port-in" type="button" data-node="${node.id}" data-port="in" aria-label="${escapeHtml(t('edge.to'))}"></button>` : ''}
          ${hasOutputPort(node) ? `<button class="port port-out" type="button" data-node="${node.id}" data-port="out" aria-label="${escapeHtml(t('edge.from'))}"></button>` : ''}
          <span>${escapeHtml(spec.label)}</span>
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
  if (node.type === 'virtual') {
    const points = node.data?.wallErrorPoints ?? []
    return {
      label: t('node.virtual'),
      meta: t('node.virtualMeta'),
      name: t('node.virtualName'),
      tags: [node.params.model_version, `${points.length || 0} ${t('field.points')}`],
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

  if (from.groupId && from.groupId === to.groupId) {
    return (from.type === 'processInput' && to.type === 'process') || (from.type === 'process' && to.type === 'processOutput')
  }

  if (to.type === 'process' || to.type === 'processOutput') return false
  return nodeInputTypes(to).includes(nodeOutputType(from))
}

function addEdge(from, to, options = {}) {
  if (state.edges.some((edge) => edge.from === from && edge.to === to)) return
  state.edges = state.edges.filter((edge) => edge.to !== to)
  state.edges.push({ from, to })
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
  state.edges = []
  state.connectingFrom = null
  renderGraph()
  setStatus(t('status.ready'), 'ready')
}

function resetLayout() {
  let row = 0
  const virtualNodes = state.nodes.filter((node) => node.type === 'virtual')
  virtualNodes.forEach((node, index) => {
    node.x = 80
    node.y = 120 + index * 170
  })

  const groupIds = [...new Set(state.nodes.filter((node) => node.groupId).map((node) => node.groupId))]
  groupIds.forEach((groupId) => {
    const y = 120 + row * 170
    const input = groupInput(groupId)
    const process = groupProcess(groupId)
    const output = groupOutput(groupId)
    if (input) Object.assign(input, { x: 390, y })
    if (process) Object.assign(process, { x: 390 + PROCESS_GAP, y })
    if (output) Object.assign(output, { x: 390 + PROCESS_GAP * 2, y })
    row += 1
  })
  renderGraph()
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
}

function renderInspector() {
  const node = selectedNode()
  if (!node) {
    elements.inspectorTitle.textContent = t('inspector.label')
    elements.inspectorContent.innerHTML = `<p class="muted">${escapeHtml(t('result.empty'))}</p>`
    return
  }

  elements.inspectorTitle.textContent = nodeLabel(node.id)
  if (node.type === 'virtual') elements.inspectorContent.innerHTML = virtualInspectorHtml(node)
  else if (node.type === 'processInput') elements.inspectorContent.innerHTML = inputInspectorHtml(node)
  else if (node.type === 'process') elements.inspectorContent.innerHTML = processInspectorHtml(node)
  else elements.inspectorContent.innerHTML = outputInspectorHtml(node)
  bindInspectorActions()
}

function virtualInspectorHtml(node) {
  const points = node.data?.wallErrorPoints ?? []
  const wallErrorReady = points.some((point) => Number.isFinite(Number(point.error)))
  return `
    <section class="inspector-section">
      <h2>${escapeHtml(t('node.virtualName'))}</h2>
      <dl class="kv-list">
        <dt>${escapeHtml(t('param.modelVersion'))}</dt><dd>${escapeHtml(node.params.model_version)}</dd>
        <dt>${escapeHtml(t('param.material'))}</dt><dd>${escapeHtml(node.params.material.name)}</dd>
        <dt>${escapeHtml(t('param.radialDepth'))}</dt><dd>${escapeHtml(node.params.process.radial_depth)} mm</dd>
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
  if (node.type === 'virtual') renderVirtualDialog(node)
  else if (node.type === 'processInput') renderInputDialog(node)
  else if (node.type === 'process') renderProcessDialog(node)
  else renderOutputDialog(node)
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
}

function renderVirtualDialog(node) {
  elements.dialogTitle.textContent = t('dialog.virtualTitle')
  elements.dialogBody.className = 'dialog-body virtual-dialog-body'
  const dimensions = parseWorkpieceDimensionsFromParams(node.params)
  const keyPoints = parseVirtualKeyPoints(node.params.key_points)
  const selectedMaterialId = node.params.material_id || node.params.material.name
  const selectedToolId = node.params.tool_id || node.params.tool.type
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
        <div class="form-grid-two">
          ${textField('vmLength', `${t('param.length')} L`, node.params.workpiece.length)}
          ${textField('vmHeight', `${t('param.height')} H1`, node.params.workpiece.height)}
          ${textField('vmThickness', `${t('param.thickness')} t`, node.params.workpiece.thickness)}
          ${textField('vmBaseWidth', `${t('param.baseWidth')} W`, node.params.workpiece.base_width)}
          ${textField('vmBaseHeight', `${t('param.baseHeight')} H2`, node.params.workpiece.base_height)}
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
        </div>
        <label>
          <span>${escapeHtml(t('param.cuttingMode'))}</span>
          <select id="vmCuttingMode">
            <option value="down_milling" ${node.params.process.cutting_mode === 'down_milling' ? 'selected' : ''}>down_milling</option>
            <option value="up_milling" ${node.params.process.cutting_mode === 'up_milling' ? 'selected' : ''}>up_milling</option>
          </select>
        </label>
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
      <article class="preview-card">
        <div class="preview-title">
          <span>${escapeHtml(t('param.workpiecePreview'))}</span>
          <strong data-preview-summary>${escapeHtml(workpieceSummaryText(dimensions ?? fallbackWorkpieceDimensions()))}</strong>
        </div>
        <div id="vmWorkpiecePreview" class="vm-preview-stage" aria-label="${escapeHtml(t('param.workpiecePreview'))}"></div>
      </article>
      <article class="preview-card">
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

function saveSelectedDialogValues() {
  const node = selectedNode()
  if (!node) return
  if (node.type === 'virtual') saveVirtualDialogValues(node)
  if (node.type === 'processInput') saveInputDialogValues(node)
  if (node.type === 'process') saveProcessDialogValues(node)
  setStatus(t('status.saved'), 'ready')
  renderGraph()
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
    stiffness_file_name: document.querySelector('#vmStiffnessFileName')?.textContent === t('files.unselected')
      ? ''
      : document.querySelector('#vmStiffnessFileName')?.textContent ?? node.params.stiffness_file_name,
    tool_id: document.querySelector('#vmToolSelect')?.value ?? node.params.tool_id,
  }
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

async function runWorkflow() {
  saveApiBaseFromField()
  const runnable = runnableNodesForSelection()
  if (!runnable.length) {
    setStatus(t('status.noRunnable'), 'error')
    return
  }

  setStatus(t('status.running'), 'running')
  elements.runWorkflow.disabled = true
  try {
    for (const node of runnable) {
      if (node.type === 'virtual') await runVirtualMachiningNode(node)
      if (node.type === 'process') await runProcessNode(node)
      propagateFromNode(node.id)
      const output = node.groupId ? groupOutput(node.groupId) : null
      if (output) propagateFromNode(output.id)
    }
    setStatus(t('status.done'), 'done')
    renderGraph()
  } catch (error) {
    setStatus(errorMessage(error, 'workflow failed'), 'error')
    renderGraph()
  } finally {
    elements.runWorkflow.disabled = false
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
  let body
  try {
    const response = await fetch(`${normalizeApiBase(node.apiBase)}/workflow/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        node_id: node.manifest?.id ?? 'wall-thickness-compensation',
        trace_id: `platform-${Date.now()}`,
        payload: {
          method: node.params.method,
          model_version: node.params.model_version,
          points,
          radial_depth: numberValue(node.params.radial_depth, 1),
        },
      }),
    })
    body = await parseJsonResponse(response)
  } catch (error) {
    body = localCompensationWorkflow(node, points, error)
  }
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
    suggestion = -averageError
  } else {
    const denominator = Math.abs(radialDepth - averageError) < 1e-12 ? radialDepth : radialDepth - averageError
    const multiplier = radialDepth / denominator
    if (node.params.method === 'first_order') {
      suggestion = -(multiplier * averageError)
    } else {
      const stiffnessValues = points.map((point) => Number(point.stiffness)).filter(Number.isFinite)
      const averageStiffness = average(stiffnessValues) ?? 1
      const correctionDenominator = 1 - averageStiffness / (averageStiffness * 0.85) + multiplier
      suggestion = Math.abs(correctionDenominator) < 1e-12 ? -averageError : -(multiplier / correctionDenominator) * averageError
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
  const request = buildVirtualPredictionRequest(node.params)
  const scenePayload = {
    source: 'workflow_platform',
    type: 'virtual_machining_scene',
    ...request,
    key_points: parseVirtualKeyPoints(node.params.key_points),
  }
  const unityMessages = []

  try {
    await state.virtualMachining.load()
    await state.virtualMachining.loadScene(scenePayload)
    node.virtualSceneReady = true
    unityMessages.push('scene sent')
  } catch (error) {
    node.virtualSceneReady = false
    unityMessages.push(errorMessage(error, 'Unity scene load skipped'))
  }

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

  const points = body.points ?? []
  const materialRemovalPreview = buildMaterialRemovalPreviewPayload(request, points)
  node.data = {
    materialRemovalPreview,
    source: node.id,
    summary: body.summary,
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
      points,
      summary: body.summary,
      unity_messages: unityMessages,
    },
    status: 'succeeded',
    trace_id: `platform-${Date.now()}`,
  }
  state.lastResponse = node.lastResponse

  try {
    if (!node.virtualSceneReady) {
      await state.virtualMachining.loadScene(scenePayload)
      node.virtualSceneReady = true
      unityMessages.push('scene sent')
    }
    await state.virtualMachining.startMaterialRemovalPreview(materialRemovalPreview)
    unityMessages.push('cutting preview sent')
  } catch (error) {
    unityMessages.push(errorMessage(error, 'Unity cutting preview skipped'))
  }
}

function runnableNodesForSelection() {
  const selected = selectedNode()
  const component = selected ? connectedComponent(selected.id) : new Set(state.nodes.map((node) => node.id))
  return topologicalNodeOrder()
    .filter((node) => component.has(node.id))
    .filter((node) => node.type === 'virtual' || node.type === 'process')
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
  state.nodes.push(node)
  if (options.select !== false) state.selectedNodeId = id
  if (options.render !== false) renderGraph()
  return node
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

function buildMaterialRemovalPreviewPayload(request, points) {
  return {
    workpiece: {
      length: request.workpiece.length,
      height: request.workpiece.height,
      thickness: request.workpiece.thickness,
      baseWidth: request.workpiece.base_width,
      baseHeight: request.workpiece.base_height,
    },
    process: {
      spindleSpeed: request.process.spindle_speed,
      feedRate: request.process.feed_rate,
      axialDepth: request.process.axial_depth,
      radialDepth: request.process.radial_depth,
      cuttingMode: request.process.cutting_mode,
    },
    points: points
      .filter((point) => Number.isFinite(Number(point.error)))
      .map((point) => ({
        id: point.id,
        x: numberValue(point.y, 0) - request.process.radial_depth,
        y: numberValue(point.z, 0),
        z: numberValue(point.x, 0),
        stiffness: numberValue(point.stiffness, 0),
        error: numberValue(point.error, 0),
      })),
  }
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
  if (node.type === 'virtual') return 'wall_error'
  if (node.type === 'processInput' || node.type === 'process' || node.type === 'processOutput') {
    const registry = processRegistryByKind(node.processKind)
    return node.type === 'processInput' ? registry.inputType : registry.outputType
  }
  return null
}

function nodeInputTypes(node) {
  if (!node) return []
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
  return nodeInputTypes(node).length > 0 || node.type === 'process' || node.type === 'processOutput'
}

function hasOutputPort(node) {
  return node.type === 'virtual' || node.type === 'processInput' || node.type === 'process' || node.type === 'processOutput'
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
  const node = selectedNode()
  if (!node || node.type !== 'virtual') return
  const points = node.data?.wallErrorPoints ?? []
  if (!points.some((point) => Number.isFinite(Number(point.error)))) {
    setStatus(t('param.previewCutting'), 'error')
    return
  }
  try {
    const request = buildVirtualPredictionRequest(node.params)
    const scenePayload = {
      source: 'workflow_platform',
      type: 'virtual_machining_scene',
      ...request,
      key_points: parseVirtualKeyPoints(node.params.key_points),
    }
    const payload = buildMaterialRemovalPreviewPayload(request, points)
    if (!node.virtualSceneReady) {
      await state.virtualMachining.loadScene(scenePayload)
      node.virtualSceneReady = true
    }
    await state.virtualMachining.startMaterialRemovalPreview(payload)
    const messages = node.lastResponse?.result?.unity_messages
    if (Array.isArray(messages)) messages.push('cutting preview sent')
    setStatus(t('status.done'), 'done')
    renderInspector()
  } catch (error) {
    setStatus(errorMessage(error, 'Unity cutting preview failed'), 'error')
  }
}

async function resetVirtualMachiningScene() {
  try {
    await state.virtualMachining.resetScene()
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
  const stiffnessFile = document.querySelector('#vmStiffnessFile')
  const importButton = document.querySelector('[data-dialog-action="importStiffness"]')
  const dimensionInputs = ['#vmLength', '#vmHeight', '#vmThickness', '#vmBaseWidth', '#vmBaseHeight']
    .map((selector) => document.querySelector(selector))
    .filter(Boolean)
  const processInputs = ['#vmSpindleSpeed', '#vmFeedRate', '#vmAxialDepth', '#vmRadialDepth']
    .map((selector) => document.querySelector(selector))
    .filter(Boolean)
  const toolInputs = ['#vmDiameter', '#vmTeeth', '#vmHelixAngle', '#vmCutterLength', '#vmOverallLength']
    .map((selector) => document.querySelector(selector))
    .filter(Boolean)

  bindVirtualTabs()
  renderVirtualDialogPreviews()
  requestAnimationFrame(renderVirtualDialogPreviews)

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
    })
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
    feed_rate: valueFromInput('#vmFeedRate', '48'),
    radial_depth: valueFromInput('#vmRadialDepth', '1.0'),
    spindle_speed: valueFromInput('#vmSpindleSpeed', '7200'),
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
  return defaultWallErrorPoints().map(({ error, ...point }) => point)
}

function defaultVirtualMachiningParameters() {
  return {
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
    stiffness_file_name: '',
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
    workpiece: {
      base_height: '16',
      base_width: '64',
      height: '56',
      length: '120',
      thickness: '3',
    },
  }
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
