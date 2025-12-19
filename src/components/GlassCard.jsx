import './GlassCard.css'

export default function GlassCard({
    children,
    className = '',
    color = null,
    onClick = null,
    animate = false
}) {
    return (
        <div
            className={`glass-card ${animate ? 'animate-slideUp' : ''} ${onClick ? 'clickable' : ''} ${className}`}
            style={color ? { '--card-accent': color } : {}}
            onClick={onClick}
        >
            {color && <div className="glass-card-accent" />}
            {children}
        </div>
    )
}
