import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';

function SelfIcon() {
  return (
    <div style={{ position: 'relative', width: '44px', height: '44px' }}>
      <div className="self-pulse" />
      <div className="self-dot">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#000">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      </div>
    </div>
  );
}

export default function SelfMarker({ position, name }) {
  const iconHtml = renderToStaticMarkup(<SelfIcon />);
  const icon = L.divIcon({
    html: iconHtml,
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });

  return <Marker position={position} icon={icon} zIndexOffset={1000} />;
}
