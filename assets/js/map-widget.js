/**
 * map-widget.js
 * Optimized for Top-Left (0,0) coordinates to prevent Vertical Drift
 * Anchor: Top-Left [0,0] | Bottom-Right [-height, width]
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
        // Ensure container is fully rendered before Leaflet touches it
        if (!this.container || this.container.offsetWidth === 0) {
            setTimeout(() => this.init(), 100);
            return;
        }

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
        this.container.innerHTML = ''; 
        this.container.style.height = mapData.display_height || '600px';

        const w = mapData.width;
        const h = mapData.height;

        // THE VERTICAL DRIFT KILLER:
        // By making H negative, [0,0] is locked to the top-left corner of the container.
        const bounds = [[-h, 0], [0, w]]; 

        this.map = L.map(this.container.id, {
            crs: L.CRS.Simple,
            minZoom: -2,
            maxBounds: bounds,
            maxBoundsViscosity: 1.0, // Hard lock to image edges
            zoomSnap: 0.1,           // Smoother zooming/centering
            attributionControl: false
        });

        L.imageOverlay(mapData.map_file_url, bounds, {
            crossOrigin: true,
            interactive: true
        }).addTo(this.map);

        // DATABASE CENTERING FIX:
        // Force initial_y to be negative to match the coordinate system
        if (mapData.initial_x !== null && mapData.initial_y !== null) {
            const centerY = mapData.initial_y > 0 ? -mapData.initial_y : mapData.initial_y;
            this.map.setView([centerY, mapData.initial_x], mapData.initial_zoom || 0);
        } else {
            this.map.fitBounds(bounds);
        }

        this.loadLocations();

        if (this.isEditable) {
            this.setupEditorControls();
        }
    }

    async loadLocations() {
        console.log('Loading locations for map ID:', this.currentMapData.id);
        
        const { data, error } = await supabase
            .from('locations')
            .select('*')
            .eq('map_id', this.currentMapData.id);

        if (error) {
            console.error("Error loading pins:", error);
            return;
        }
        
        console.log('Locations loaded:', data?.length || 0, 'pins');
        
        if (!data || data.length === 0) {
            console.warn('No locations found for this map');
            return;
        }
        
        data.forEach(loc => {
            console.log('Adding marker:', loc.name, `at [${loc.y}, ${loc.x}]`);
            this.addMarker(loc);
        });
        
        console.log('All markers added. Total markers on map:', this.markers.size);
    }

    addMarker(location) {
        const x = parseFloat(location.x);
        const y = parseFloat(location.y);

        // CONSISTENCY FIX: Always store Y as negative in DB, use as-is
        // No more conditional flipping - just use the raw value
        const marker = L.marker([y, x]).addTo(this.map);
        
        let popupContent = `
            <div class="location-display">
                <h3 class="map-component-title">${location.name}</h3>
                <p>${location.description || ''}</p>
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
                        <label>Location Name</label>
                        <input type="text" id="new-pin-name">
                        <button onclick="window.mapComponents['${this.container.id}'].savePin(${lat}, ${lng})">Save Pin</button>
                    </div>
                `).openOn(this.map);
        });

        // Add a "Save View" button for Staff
        const saveViewBtn = L.control({ position: 'topright' });
        saveViewBtn.onAdd = () => {
            const btn = L.DomUtil.create('button', 'save-view-btn');
            btn.innerHTML = '💾 Set Default View';
            btn.style.padding = '8px';
            btn.style.cursor = 'pointer';
            btn.style.backgroundColor = '#3498db';
            btn.style.color = 'white';
            btn.style.border = 'none';
            btn.style.borderRadius = '4px';
            btn.style.fontWeight = 'bold';
            btn.onclick = () => this.saveCurrentView();
            return btn;
        };
        saveViewBtn.addTo(this.map);

        // Add a "Show Current Coords" button for debugging
        const coordsBtn = L.control({ position: 'bottomleft' });
        coordsBtn.onAdd = () => {
            const container = L.DomUtil.create('div', 'coords-display');
            container.style.padding = '5px 10px';
            container.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            container.style.borderRadius = '4px';
            container.style.fontSize = '12px';
            container.innerHTML = 'Center: [0, 0] Zoom: 0';
            
            this.map.on('moveend zoomend', () => {
                const center = this.map.getCenter();
                const zoom = this.map.getZoom();
                container.innerHTML = `Center: [${center.lat.toFixed(1)}, ${center.lng.toFixed(1)}] Zoom: ${zoom.toFixed(1)}`;
            });
            
            return container;
        };
        coordsBtn.addTo(this.map);
    }

    async savePin(lat, lng) {
        const name = document.getElementById('new-pin-name').value;
        
        // CONSISTENCY FIX: Save coordinates exactly as Leaflet gives them
        // Since our coordinate system has negative Y, store lat as-is
        const { data, error } = await supabase
            .from('locations')
            .insert([{ 
                map_id: this.currentMapData.id, 
                name, 
                x: lng,  // X is straightforward
                y: lat   // Y is already negative from our coordinate system
            }])
            .select();

        if (error) return alert(error.message);
        this.addMarker(data[0]);
        this.map.closePopup();
    }

    async saveCurrentView() {
        const center = this.map.getCenter();
        const zoom = this.map.getZoom();

        const { error } = await supabase
            .from('location_maps')
            .update({
                initial_x: center.lng,
                initial_y: center.lat,  // Store as-is (will be negative)
                initial_zoom: zoom
            })
            .eq('id', this.currentMapData.id);

        if (error) {
            alert("Error saving view: " + error.message);
        } else {
            alert(`Default view saved!\nCenter: [${center.lat.toFixed(1)}, ${center.lng.toFixed(1)}]\nZoom: ${zoom.toFixed(1)}`);
        }
    }

    async deletePin(id) {
        if (!confirm("Delete this pin?")) return;
        const { error } = await supabase.from('locations').delete().eq('id', id);
        if (error) return alert(error.message);
        
        this.map.removeLayer(this.markers.get(id));
        this.markers.delete(id);
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