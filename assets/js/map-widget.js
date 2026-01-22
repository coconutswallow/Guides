/**
 * map-widget.js (Simplified 16:9 Version)
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

        try {
            if (this.mapId) {
                await this.loadMapById(this.mapId);
            } else if (this.mapName) {
                await this.loadMapByName(this.mapName);
            } else {
                this.renderError("No map ID or name provided.");
            }
        } catch (err) {
            console.error("Initialization error:", err);
            this.renderError("Failed to initialize map.");
        }
    }

    async loadMapById(id) {
        const { data, error } = await supabase
            .from('location_maps')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        this.renderMap(data);
    }

    async loadMapByName(name) {
        const { data, error } = await supabase
            .from('location_maps')
            .select('*')
            .eq('name', name)
            .single();
        if (error) throw error;
        this.renderMap(data);
    }

    renderMap(mapData) {
        this.currentMapData = mapData;
        
        // CLEANUP: Reset container but DO NOT set height manually.
        // CSS aspect-ratio: 16/9 handles the size.
        this.container.innerHTML = ''; 
        
        // Use standard image coordinate bounds
        const w = mapData.width;
        const h = mapData.height;
        const bounds = [[0, 0], [h, w]];

        // Create Map
        const customCRS = L.extend({}, L.CRS.Simple, {
            transformation: new L.Transformation(1, 0, 1, 0)
        });

        this.map = L.map(this.container.id, {
            crs: customCRS,
            minZoom: -3,
            maxZoom: 2,
            maxBounds: bounds,
            maxBoundsViscosity: 1.0,
            attributionControl: false,
            zoomSnap: 0.25,
            zoomDelta: 0.25,
            zoomAnimation: false       // Disable animation to prevent jitter
        });

        // Add Image Overlay
        const imageOverlay = L.imageOverlay(mapData.map_file_url, bounds, {
            interactive: true
        }).addTo(this.map);

        // Force a resize check once image is loaded to ensure it fits the CSS box
        const img = imageOverlay.getElement();
        if (img) {
            const updateLayout = () => {
                this.map.invalidateSize();
                this.setInitialView(mapData, bounds);
            };
            
            img.onload = updateLayout;
            if (img.complete) updateLayout();
        } else {
            this.setInitialView(mapData, bounds);
        }

        // Fix marker positions on zoom
        this.map.on('zoomend', () => {
            this.map.eachLayer((layer) => {
                if (layer instanceof L.Marker) layer.update();
            });
        });

        this.loadLocations();

        if (this.isEditable) {
            this.setupEditorControls();
        }
    }

    setInitialView(mapData, bounds) {
        if (mapData.initial_x !== null && mapData.initial_y !== null) {
            this.map.setView([mapData.initial_y, mapData.initial_x], mapData.initial_zoom || 0, { animate: false });
        } else {
            this.map.fitBounds(bounds, { animate: false });
        }
    }

    async loadLocations() {
        const { data, error } = await supabase
            .from('locations')
            .select('*')
            .eq('map_id', this.currentMapData.id);

        if (error || !data) return;
        
        data.forEach(loc => this.addMarker(loc));
    }

    addMarker(location) {
        const x = parseFloat(location.x);
        let y = parseFloat(location.y);

        // Legacy fix for negative coordinates
        if (y < 0) y = Math.abs(y);

        const marker = L.marker([y, x]).addTo(this.map);
        
        let popupContent = `
            <div class="location-display">
                <h3 class="map-component-title">${location.name}</h3>
                ${location.description ? `<p>${location.description}</p>` : ''}
                ${location.link_url ? `<a href="${location.link_url}" target="_blank">View Details</a>` : ''}
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
            L.popup()
                .setLatLng(e.latlng)
                .setContent(`
                    <div class="pin-form">
                        <label>Location Name*</label>
                        <input type="text" id="new-pin-name" placeholder="Name">
                        <label>Description</label>
                        <textarea id="new-pin-description" rows="2"></textarea>
                        <label>Link URL</label>
                        <input type="text" id="new-pin-link">
                        <label><input type="checkbox" id="new-pin-home"> Set Home</label>
                        <button onclick="window.mapComponents['${this.container.id}'].savePin(${lat}, ${lng})">Save Pin</button>
                    </div>
                `).openOn(this.map);
        });

        // Save View Button
        const saveViewBtn = L.control({ position: 'topright' });
        saveViewBtn.onAdd = () => {
            const btn = L.DomUtil.create('button', 'save-view-btn');
            btn.innerHTML = '💾 Set Default View';
            btn.style.padding = '5px 10px';
            btn.style.cursor = 'pointer';
            btn.onclick = () => this.saveCurrentView();
            return btn;
        };
        saveViewBtn.addTo(this.map);
    }

    async savePin(lat, lng) {
        const name = document.getElementById('new-pin-name').value.trim();
        const description = document.getElementById('new-pin-description').value.trim();
        const link = document.getElementById('new-pin-link').value.trim();
        const isHome = document.getElementById('new-pin-home').checked;
        
        if (!name) return alert('Name required');
        
        const pinData = {
            map_id: this.currentMapData.id,
            name: name,
            x: lng,
            y: lat,
            description: description || null,
            link_url: link || null,
            is_home: isHome
        };
        
        const { data, error } = await supabase.from('locations').insert([pinData]).select();
        if (error) return alert(error.message);
        
        this.addMarker(data[0]);
        this.map.closePopup();
    }

    async saveCurrentView() {
        const center = this.map.getCenter();
        const zoom = this.map.getZoom();
        const { error } = await supabase
            .from('location_maps')
            .update({ initial_x: center.lng, initial_y: center.lat, initial_zoom: zoom })
            .eq('id', this.currentMapData.id);

        if (error) alert("Error: " + error.message);
        else alert("Default view saved.");
    }

    async deletePin(id) {
        if (!confirm("Delete this pin?")) return;
        const { error } = await supabase.from('locations').delete().eq('id', id);
        if (error) return alert(error.message);
        this.map.removeLayer(this.markers.get(id));
        this.markers.delete(id);
    }

    renderError(msg) {
        this.container.innerHTML = `<div class="error">${msg}</div>`;
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