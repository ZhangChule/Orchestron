export const DEFAULT_STIFFNESS_FILE_NAME = 'stiffness.txt'
export const DEFAULT_STIFFNESS_FILE_PATH = 'D:\\PhD\\ARPPL_code\\process_apps\\thinwall-dt\\frontend\\public\\stiffness.txt'

export const DEFAULT_STIFFNESS_VALUES = Object.freeze([
  266.9039146,
  464.8856381,
  543.6949509,
  529.904264,
  427.4478514,
  213.8579983,
])

export function defaultVirtualStiffnessPoints() {
  return DEFAULT_STIFFNESS_VALUES.map((stiffness, index) => ({
    colIndex: index,
    id: `K${index + 1}_J1_I1`,
    matrixIndex: 0,
    rowIndex: 0,
    stiffness,
    x: index * 24,
    y: 0,
    z: 0,
  }))
}
