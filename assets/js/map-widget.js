/**
 * map-widget.js
 * Features: Top-Left (0,0) coords, Rich Pin Editing, Home Icons, View Saving
 */

import { supabase } from './supabaseClient.js';

// 1. Custom Icons
// Standard Leaflet Marker
const defaultIcon = new L.Icon.Default();

// Black Home Icon (SVG Data URI - No external files needed)
const homeIcon = L.icon({
    iconUrl: 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22black%22%20width%3D%2232%22%20height%3D%2232%22%3E%3Cpath%20d%3D%22M10%2020v-6h4v6h5v-8h3L12%203%202%2012h3v8z%22%2F%3E%3Cpath%20d%3D%22M0%200h24v24H0z%22%20fill%3D%22none%22%2F%3E%3C%2Fsvg%3E',
    iconSize: [32, 32],
    iconAnchor: [16, 30], // Bottom-center align
    popupAnchor: [0, -30]
});

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
        if (!this.container || this.container.offsetWidth === 0) {
            setTimeout(() => this.init(), 100);
            return;
        }

        try {
            if (this.mapId) await this.loadMapById(this.mapId);
            else if (this.mapName) await this.loadMapByName(this.mapName);
            else this.renderError("No map ID provided.");
        } catch (err) {
            console.error(err);
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
        
        // Use database height if provided, otherwise fallback
        if (!this.container.style.height && !this.container.classList.contains('responsive-map-frame')) {
             this.container.style.height = mapData.display_height || '600px';
        }

        const w = mapData.width;
        const h = mapData.height;
        // Logic: [0,0] Top-Left to [-Height, Width] Bottom-Right
        const bounds = [[-h, 0], [0, w]];

        this.map = L.map(this.container.id, {
            crs: L.CRS.Simple,
            minZoom: -2,
            maxZoom: 2,
            zoomSnap: 0.25,          // Feature: Smaller zoom steps
            zoomDelta: 0.25,
            maxBounds: bounds,       // Feature: Constrain view to image
            maxBoundsViscosity: 1.0, // Feature: Hard stop at edges
            attributionControl: false
        });

        L.imageOverlay(mapData.map_file_url, bounds).addTo(this.map);
        
        // Initial View Setting
        if (mapData.initial_x !== null && mapData.initial_y !== null) {
            this.map.setView([mapData.initial_y, mapData.initial_x], mapData.initial_zoom || 0);
        } else {
            this.map.fitBounds(bounds);
        }

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
        // Correct for coordinate system (Y is negative in Leaflet Simple CRS)
        const lat = y > 0 ? -y : y;

        // Feature: Use Home Icon if applicable
        const icon = location.is_home ? homeIcon : defaultIcon;

        const marker = L.marker([lat, x], { icon: icon }).addTo(this.map);
        
        // Popup Content
        let content = `
            <div class="location-display">
                <h3 class="map-component-title">${location.name}</h3>
                ${location.description ? `<p>${location.description}</p>` : ''}
                ${location.link_url ? `<a href="${location.link_url}" target="_blank">View Details</a>` : ''}
            </div>
        `;

        if (this.isEditable) {
            content += `
                <hr style="margin: 8px 0; border-top: 1px solid #eee;">
                <div class="edit-actions">
                    <button class="delete-btn" onclick="window.mapComponents['${this.container.id}'].deletePin(${location.id})">Delete Pin</button>
                </div>
            `;
        }

        marker.bindPopup(content);
        this.markers.set(location.id, marker);
    }

    setupEditorControls() {
        // 1. Right-click to Add Pin (Updated with Fields)
        this.map.on('contextmenu', (e) => {
            const { lat, lng } = e.latlng;
            // Convert back to positive integer Y for database
            const dbY = Math.abs(Math.round(lat)); 
            const dbX = Math.round(lng);

            L.popup()
                .setLatLng(e.latlng)
                .setContent(`
                    <div class="pin-form">
                        <label>Location Name*</label>
                        <input type="text" id="new-pin-name" placeholder="Name">
                        
                        <label>Description</label>
                        <textarea id="new-pin-desc" rows="2"></textarea>
                        
                        <label>Link URL</label>
                        <input type="text" id="new-pin-link" placeholder="https://...">
                        
                        <label class="checkbox-label" style="display:flex; align-items:center; gap:5px; margin-top:5px; cursor:pointer;">
                            <input type="checkbox" id="new-pin-home"> 
                            <strong>Set as Home/HQ</strong>
                        </label>
                        
                        <button onclick="window.mapComponents['${this.container.id}'].savePin(${dbY}, ${dbX})">Save Pin</button>
                    </div>
                `).openOn(this.map);
        });

        // 2. "Set Default View" Button
        const SaveViewControl = L.Control.extend({
            onAdd: () => {
                const btn = L.DomUtil.create('button', 'save-view-btn');
                btn.innerHTML = '💾 Set Default View';
                btn.title = "Save current zoom and position as default for all users";
                
                // Inline styles for the button to avoid dependency on external CSS
                Object.assign(btn.style, {
                    padding: '6px 10px',
                    cursor: 'pointer',
                    backgroundColor: 'white',
                    color: '#333',
                    border: '2px solid rgba(0,0,0,0.2)',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    fontFamily: 'sans-serif',
                    fontSize: '12px',
                    boxShadow: '0 1px 5px rgba(0,0,0,0.4)'
                });
                
                btn.onclick = (e) => {
                    L.DomEvent.stopPropagation(e);
                    this.saveCurrentView();
                };
                return btn;
            },
            onRemove: () => {}
        });
        
        this.map.addControl(new SaveViewControl({ position: 'topright' }));
    }

    async savePin(dbY, dbX) {
        const name = document.getElementById('new-pin-name').value;
        const desc = document.getElementById('new-pin-desc').value;
        const link = document.getElementById('new-pin-link').value;
        const isHome = document.getElementById('new-pin-home').checked;

        if (!name) return alert("Name is required.");

        const { data, error } = await supabase.from('locations').insert([{
            map_id: this.currentMapData.id,
            name: name,
            description: desc || null,
            link_url: link || null,
            is_home: isHome,
            x: dbX,
            y: dbY
        }]).select();

        if (error) {
            alert("Error saving: " + error.message);
        } else {
            this.addMarker(data[0]);
            this.map.closePopup();
        }
    }

    async saveCurrentView() {
        const center = this.map.getCenter();
        const zoom = this.map.getZoom();

        const { error } = await supabase
            .from('location_maps')
            .update({
                initial_x: center.lng,
                initial_y: center.lat,
                initial_zoom: zoom
            })
            .eq('id', this.currentMapData.id);

        if (error) alert("Error saving view: " + error.message);
        else alert("Default map view saved!");
    }

    async deletePin(id) {
        if (!confirm("Delete this pin?")) return;
        const { error } = await supabase.from('locations').delete().eq('id', id);
        if (!error) {
            this.map.removeLayer(this.markers.get(id));
            this.markers.delete(id);
        } else {
            alert(error.message);
        }
    }

    renderError(msg) {
        this.container.innerHTML = `<div class="error" style="display:block">${msg}</div>`;
    }
}

window.mapComponents = window.mapComponents || {};
export function initMapComponents() {
    document.querySelectorAll('[data-map-component]').forEach(el => {
        if (!window.mapComponents[el.id]) {
            window.mapComponents[el.id] = new MapComponent(el);
        }
    });
}