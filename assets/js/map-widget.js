/**
 * map-widget.js
 * Integrated Map Component for Hawthorne Guild
 * Handles: Simple CRS (Pixels), Staff Roles, and Vertical Drift Fixes
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
        this.markers = [];
        
        this.init();
    }

    async init() {
        try {
            // 1. Fetch Map Data
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
        this.container.innerHTML = ''; // Clear loading state
        this.container.style.height = mapData.display_height || '600px';

        // COORDINATE SYSTEM FIX: Use exact image pixels
        const w = mapData.width;
        const h = mapData.height;
        const bounds = [[0, 0], [h, w]];

        this.map = L.map(this.container.id, {
            crs: L.CRS.Simple,
            minZoom: -2,
            maxBounds: bounds,
            maxBoundsViscosity: 1.0,
            attributionControl: false
        });

        // IMAGE OVERLAY: Added crossOrigin for Supabase hosting
        L.imageOverlay(mapData.map_file_url, bounds, {
            crossOrigin: true,
            interactive: true
        }).addTo(this.map);

        // INITIAL VIEW: Set to saved defaults or fit entire image
        if (mapData.initial_x !== null && mapData.initial_y !== null) {
            this.map.setView([mapData.initial_y, mapData.initial_x], mapData.initial_zoom || 0);
        } else {
            this.map.fitBounds(bounds);
        }

        this.loadLocations();

        // EDITING LOGIC: Only for Staff/Apprentices
        if (this.isEditable) {
            this.setupEditorControls();
        }
    }

    async loadLocations() {
        const { data, error } = await supabase
            .from('locations')
            .select('*')
            .eq('map_id', this.currentMapData.id);

        if (error) {
            console.error("Error loading pins:", error);
            return;
        }

        data.forEach(loc => this.addMarker(loc));
    }

    addMarker(location) {
        const marker = L.marker([location.y, location.x]).addTo(this.map);
        
        let popupContent = `
            <div class="location-display">
                <h3>${location.name}</h3>
                <p>${location.description || ''}</p>
                ${location.link_url ? `<a href="${location.link_url}" target="_blank">View Details</a>` : ''}
            </div>
        `;

        if (this.isEditable) {
            popupContent += `
                <hr>
                <button class="edit-btn" onclick="window.mapComponents['${this.container.id}'].openEditForm(${location.id})">Edit Pin</button>
            `;
        }

        marker.bindPopup(popupContent);
        this.markers.push({ id: location.id, marker });
    }

    setupEditorControls() {
        // Right click to drop a new pin
        this.map.on('contextmenu', (e) => {
            const { lat, lng } = e.latlng;
            this.showNewPinForm(lat, lng);
        });

        // Add a "Save View" button to the UI
        const saveViewBtn = L.control({ position: 'topright' });
        saveViewBtn.onAdd = () => {
            const btn = L.DomUtil.create('button', 'save-view-btn');
            btn.innerHTML = '💾 Save Default View';
            btn.onclick = () => this.saveCurrentView();
            return btn;
        };
        saveViewBtn.addTo(this.map);
    }

    showNewPinForm(lat, lng) {
        const popup = L.popup()
            .setLatLng([lat, lng])
            .setContent(`
                <div class="pin-form">
                    <label>Location Name</label>
                    <input type="text" id="new-pin-name" placeholder="Marketplace...">
                    <label>Description</label>
                    <textarea id="new-pin-desc"></textarea>
                    <button onclick="window.mapComponents['${this.container.id}'].savePin(${lat}, ${lng})">Create Pin</button>
                </div>
            `)
            .openOn(this.map);
    }

    async savePin(lat, lng) {
        const name = document.getElementById('new-pin-name').value;
        const desc = document.getElementById('new-pin-desc').value;

        const { data, error } = await supabase
            .from('locations')
            .insert([{
                map_id: this.currentMapData.id,
                name: name,
                x: lng,
                y: lat,
                description: desc
            }])
            .select();

        if (error) {
            if (error.code === '23505') {
                alert("A location with this name already exists on this map.");
            } else if (error.code === '42501') {
                alert("Permission Denied: Only Staff or Staff Apprentices can create pins.");
            } else {
                alert("Error saving pin: " + error.message);
            }
            return;
        }

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
                initial_y: center.lat,
                initial_zoom: zoom
            })
            .eq('id', this.currentMapData.id);

        if (error) {
            alert("Permission Denied: Only Staff can set the default view.");
        } else {
            alert("Default view updated!");
        }
    }

    renderError(msg) {
        this.container.innerHTML = `<div class="error">${msg}</div>`;
    }
}

// Registry and Initialization
window.mapComponents = {};

export function initMapComponents() {
    const elements = document.querySelectorAll('[data-map-component]');
    elements.forEach(el => {
        if (!window.mapComponents[el.id]) {
            window.mapComponents[el.id] = new MapComponent(el);
        }
    });
}