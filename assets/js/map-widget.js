/**
 * map-widget.js
 * Restored "Old Version" Logic + Aspect Ratio Fix
 */
import { supabase } from './supabaseClient.js';

class MapComponent {
    constructor(container) {
        this.container = container;
        this.mapId = container.dataset.mapId;
        this.mapName = container.dataset.mapName;
        this.isEditable = container.dataset.editable === 'true';
        this.map = null;
        this.currentMapData = null;
        this.markers = new Map();
        
        this.init();
    }

    async init() {
        if (!this.container) return;
        
        // Wait slightly for container to be ready
        if (this.container.offsetWidth === 0) {
            setTimeout(() => this.init(), 100);
            return;
        }

        try {
            if (this.mapId) await this.loadMapById(this.mapId);
            else if (this.mapName) await this.loadMapByName(this.mapName);
            else this.renderError("No map ID provided.");
        } catch (err) {
            console.error("Init Error:", err);
            this.renderError("Map failed to load.");
        }
    }

    async loadMapById(id) {
        const { data, error } = await supabase.from('location_maps').select('*').eq('id', id).single();
        if (error) throw error;
        this.renderMap(data);
    }

    async loadMapByName(name) {
        const { data, error } = await supabase.from('location_maps').select('*').eq('name', name).single();
        if (error) throw error;
        this.renderMap(data);
    }

    renderMap(mapData) {
        this.currentMapData = mapData;
        this.container.innerHTML = ''; 

        // CRITICAL FIX: Set container aspect ratio to match image dimensions exactly.
        // This prevents the "Squashing" that causes vertical pin drift.
        if (mapData.width && mapData.height) {
            this.container.style.aspectRatio = `${mapData.width} / ${mapData.height}`;
            this.container.style.height = 'auto'; // Let width drive the height
        } else {
            this.container.style.height = '600px'; // Fallback only if no dims
        }

        const w = mapData.width;
        const h = mapData.height;

        // "Old Version" Logic: Top-Left is (0,0), Bottom-Right is (-Height, Width)
        // Lat (Y) goes negative (down), Lng (X) goes positive (right)
        const bounds = [[-h, 0], [0, w]]; 

        this.map = L.map(this.container.id, {
            crs: L.CRS.Simple,
            minZoom: -2,
            maxBounds: bounds,
            maxBoundsViscosity: 1.0,
            attributionControl: false,
            zoomControl: false // We add manual zoom if needed
        });

        L.imageOverlay(mapData.map_file_url, bounds).addTo(this.map);
        this.map.fitBounds(bounds);

        // Force a resize check to sync coordinates
        setTimeout(() => {
            this.map.invalidateSize();
            this.map.fitBounds(bounds);
        }, 100);

        this.loadLocations();

        if (this.isEditable) {
            this.setupEditorControls();
        }
    }

    async loadLocations() {
        const { data } = await supabase.from('locations').select('*').eq('map_id', this.currentMapData.id);
        if (data) data.forEach(loc => this.addMarker(loc));
    }

    addMarker(location) {
        const y = parseFloat(location.y);
        const x = parseFloat(location.x);

        // Logic: Inputs are usually positive pixels (0 to Height). 
        // We flip Y to negative to match Leaflet's CRS.Simple logic.
        const lat = y > 0 ? -y : y;
        const lng = x;

        const marker = L.marker([lat, lng]).addTo(this.map);
        
        let popupContent = `
            <div class="location-display">
                <h3>${location.name}</h3>
                ${location.description ? `<p>${location.description}</p>` : ''}
                ${location.link_url ? `<a href="${location.link_url}" target="_blank">Link</a>` : ''}
            </div>
        `;

        if (this.isEditable) {
            popupContent += `
                <hr>
                <button class="delete-btn" onclick="window.mapComponents['${this.container.id}'].deletePin(${location.id})">Delete Pin</button>
            `;
        }

        marker.bindPopup(popupContent);
        this.markers.set(location.id, marker);
    }

    setupEditorControls() {
        this.map.on('contextmenu', (e) => {
            const { lat, lng } = e.latlng;
            // Convert negative Latitude back to positive pixel Y for saving
            const saveY = Math.abs(lat); 
            const saveX = lng;

            L.popup()
                .setLatLng(e.latlng)
                .setContent(`
                    <div class="pin-form">
                        <label>Name</label><input type="text" id="new-pin-name">
                        <button onclick="window.mapComponents['${this.container.id}'].savePin(${saveY}, ${saveX})">Save Pin</button>
                    </div>
                `).openOn(this.map);
        });
    }

    async savePin(y, x) {
        const name = document.getElementById('new-pin-name').value;
        if(!name) return;

        const { data, error } = await supabase.from('locations').insert([{ 
            map_id: this.currentMapData.id, 
            name: name, 
            x: x, 
            y: y 
        }]).select();

        if (error) return alert(error.message);
        this.addMarker(data[0]);
        this.map.closePopup();
    }

    async deletePin(id) {
        if (!confirm("Delete?")) return;
        const { error } = await supabase.from('locations').delete().eq('id', id);
        if (!error) {
            this.map.removeLayer(this.markers.get(id));
            this.markers.delete(id);
        }
    }

    renderError(msg) {
        this.container.innerHTML = `<div class="error" style="display:block">${msg}</div>`;
    }
}

window.mapComponents = window.mapComponents || {};
export function initMapComponents() {
    document.querySelectorAll('[data-map-component]').forEach(el => {
        if (!el.id) el.id = 'map-' + Math.random().toString(36).substr(2, 9);
        window.mapComponents[el.id] = new MapComponent(el);
    });
}