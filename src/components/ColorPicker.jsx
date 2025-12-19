import './ColorPicker.css'

const COLOR_PRESETS = [
    { name: 'Navy', primary: '#1e3a5f', secondary: '#c9a227' },
    { name: 'Slate', primary: '#334155', secondary: '#d4a373' },
    { name: 'Teal', primary: '#115e59', secondary: '#fbbf24' },
    { name: 'Purple', primary: '#6366f1', secondary: '#8b5cf6' },
    { name: 'Blue', primary: '#3b82f6', secondary: '#06b6d4' },
    { name: 'Green', primary: '#10b981', secondary: '#22c55e' },
    { name: 'Orange', primary: '#f97316', secondary: '#fbbf24' },
    { name: 'Rose', primary: '#be123c', secondary: '#fda4af' }
]

export default function ColorPicker({
    currentColors,
    onColorChange
}) {
    const handlePresetClick = (preset) => {
        onColorChange({
            accent_color: preset.primary,
            secondary_color: preset.secondary
        })
    }

    const handleCustomChange = (field, value) => {
        onColorChange({
            ...currentColors,
            [field]: value
        })
    }

    const isPresetActive = (preset) => {
        return currentColors.accent_color === preset.primary &&
            currentColors.secondary_color === preset.secondary
    }

    return (
        <div className="color-picker">
            <div className="preset-colors">
                <p className="color-picker-label">Preset Themes</p>
                <div className="preset-grid">
                    {COLOR_PRESETS.map(preset => (
                        <button
                            key={preset.name}
                            className={`preset-btn ${isPresetActive(preset) ? 'active' : ''}`}
                            onClick={() => handlePresetClick(preset)}
                            title={preset.name}
                        >
                            <div
                                className="preset-preview"
                                style={{
                                    background: `linear-gradient(135deg, ${preset.primary} 0%, ${preset.secondary} 100%)`
                                }}
                            />
                            <span className="preset-name">{preset.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="custom-colors">
                <p className="color-picker-label">Custom Colors</p>
                <div className="custom-color-row">
                    <label className="custom-color-item">
                        <span>Primary</span>
                        <input
                            type="color"
                            value={currentColors.accent_color}
                            onChange={(e) => handleCustomChange('accent_color', e.target.value)}
                            className="color-input"
                        />
                    </label>
                    <label className="custom-color-item">
                        <span>Secondary</span>
                        <input
                            type="color"
                            value={currentColors.secondary_color}
                            onChange={(e) => handleCustomChange('secondary_color', e.target.value)}
                            className="color-input"
                        />
                    </label>
                </div>
            </div>

            <div className="color-preview">
                <p className="color-picker-label">Preview</p>
                <div
                    className="preview-box"
                    style={{
                        background: `linear-gradient(135deg, ${currentColors.accent_color} 0%, ${currentColors.secondary_color} 100%)`
                    }}
                >
                    <span>Your Theme</span>
                </div>
            </div>
        </div>
    )
}
