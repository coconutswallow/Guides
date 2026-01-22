/**
 * map-widget.js
 * Using standard positive Y coordinates (top=0, bottom=height)
 * This prevents vertical drift during zoom operations
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
        // Check width only - height might be 0 initially and get set by CSS
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

        console.log(`Map dimensions: ${w} × ${h}, aspect ratio: ${(w/h).toFixed(2)}:1`);
        console.log(`Container size: ${this.container.offsetWidth} × ${this.container.offsetHeight}`);

        // CRITICAL: Use a consistent coordinate system
        // Top-left is [0, 0], bottom-right is [h, w]
        // This matches typical image coordinates (y increases downward)
        const bounds = [[0, 0], [h, w]]; 

        this.map = L.map(this.container.id, {
            crs: L.CRS.Simple,
            minZoom: -3,
            maxZoom: 2,
            maxBounds: bounds,
            maxBoundsViscosity: 1.0,
            zoomSnap: 0.1,
            zoomDelta: 0.5,
            wheelPxPerZoomLevel: 120,
            attributionControl: false
        });

        L.imageOverlay(mapData.map_file_url, bounds, {
            crossOrigin: true,
            interactive: true
        }).addTo(this.map);

        // Set initial view
        if (mapData.initial_x !== null && mapData.initial_y !== null) {
            this.map.setView([mapData.initial_y, mapData.initial_x], mapData.initial_zoom || 0);
        } else {
            this.map.fitBounds(bounds);
        }

        // Load pins first
        this.loadLocations();

        // Add editor controls if needed
        if (this.isEditable) {
            this.setupEditorControls();
        }

        // Force Leaflet to recalculate map size after everything is loaded
        // This prevents rendering issues when container size isn't stable
        setTimeout(() => {
            if (this.map) {
                this.map.invalidateSize();
                console.log(`Map invalidated. New container: ${this.container.offsetWidth} × ${this.container.offsetHeight}`);
            }
        }, 500);
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
        let y = parseFloat(location.y);

        // BACKWARD COMPATIBILITY: Convert old negative Y coords to positive
        // If you have legacy pins saved with negative Y, this will fix them on display
        if (y < 0) {
            console.warn(`Converting legacy negative Y coordinate for "${location.name}": ${y} → ${Math.abs(y)}`);
            y = Math.abs(y);
        }

        const marker = L.marker([y, x]).addTo(this.map);
        
        let popupContent = `
            <div class="location-display">
                <h3 class="map-component-title">${location.name}</h3>
                ${location.description ? `<p>${location.description}</p>` : ''}
                ${location.link_url ? `<a href="${location.link_url}" target="_blank">View Details</a>` : ''}
                ${location.is_home ? `<p style="color: #f39c12; font-weight: bold;">🏠 Home Location</p>` : ''}
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
                        <input type="text" id="new-pin-name" placeholder="Enter location name">
                        
                        <label>Description</label>
                        <textarea id="new-pin-description" rows="3" placeholder="Optional description"></textarea>
                        
                        <label>Link URL</label>
                        <input type="text" id="new-pin-link" placeholder="https://example.com">
                        
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" id="new-pin-home" style="width: auto; margin: 0;">
                            <span>Set as Home Location</span>
                        </label>
                        
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
        const name = document.getElementById('new-pin-name').value.trim();
        const description = document.getElementById('new-pin-description').value.trim();
        const link = document.getElementById('new-pin-link').value.trim();
        const isHome = document.getElementById('new-pin-home').checked;
        
        if (!name) {
            alert('Please enter a location name');
            return;
        }
        
        // Build the insert object
        const pinData = {
            map_id: this.currentMapData.id,
            name: name,
            x: lng,  // X is straightforward
            y: lat   // Y is already negative from our coordinate system
        };
        
        // Add optional fields only if they have values
        if (description) pinData.description = description;
        if (link) pinData.link_url = link;
        if (isHome) pinData.is_home = isHome;
        
        const { data, error } = await supabase
            .from('locations')
            .insert([pinData])
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