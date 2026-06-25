export function stiffnessValuesFromText(text) {
  const values = []
  const lines = String(text ?? '').split(/\r?\n/)

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) return
    const row = line.split(/[,\s;]+/).filter(Boolean).map(Number)
    if (!row.length || row.some((value) => !Number.isFinite(value) || value <= 0)) {
      throw new Error(`stiffness matrix line ${index + 1} must contain positive numbers.`)
    }
    values.push(...row)
  })

  if (!values.length) throw new Error('stiffness file must contain at least one positive number.')
  return values
}

export function averageStiffnessFromText(text) {
  const values = stiffnessValuesFromText(text)
  return values.reduce((sum, value) => sum + value, 0) / values.length
}
