import { supabase } from './supabaseClient.js';

class MapComponent {
    constructor(container) {
        this.container = container;
        this.mapId = container.dataset.mapId;
        this.mapName = container.dataset.mapName;
        this.isEditable = container.dataset.editable === 'true';
        this.map = null;
        this.currentMapData = null;
        
        this.init();
    }

    async init() {
        if (!this.container) return;
        
        // Wait 1 tick for CSS to apply aspect-ratio
        setTimeout(async () => {
            if (this.mapId) await this.loadMapById(this.mapId);
            else if (this.mapName) await this.loadMapByName(this.mapName);
        }, 50);
    }

    async loadMapById(id) {
        const { data, error } = await supabase.from('location_maps').select('*').eq('id', id).single();
        if (!error) this.renderMap(data);
    }

    async loadMapByName(name) {
        const { data, error } = await supabase.from('location_maps').select('*').eq('name', name).single();
        if (!error) this.renderMap(data);
    }

    renderMap(mapData) {
        this.currentMapData = mapData;
        this.container.innerHTML = ''; // Clear loading spinner

        // 1. Define standard coordinate system (Top-Left is 0,0)
        // Matches standard image editing coordinates
        const mapWidth = mapData.width;   // Should be 4000
        const mapHeight = mapData.height; // Should be 2250
        
        // Bounds: [[0,0], [height, width]] -> [[Y, X], [Y, X]]
        // Note: Leaflet uses [Lat, Lng] which is [Y, X]
        const bounds = [[0, 0], [mapHeight, mapWidth]];

        // 2. Configure CRS (Coordinate Reference System)
        // Simple CRS maps lat/lng directly to x/y
        const map = L.map(this.container, {
            crs: L.CRS.Simple,
            minZoom: -2,
            maxZoom: 2,
            maxBounds: bounds,
            maxBoundsViscosity: 1.0,
            zoomControl: false, // We'll add it manually if needed
            attributionControl: false
        });
        
        this.map = map;

        // 3. Add Image Overlay
        const image = L.imageOverlay(mapData.map_file_url, bounds).addTo(map);
        map.fitBounds(bounds);

        // 4. Force resize recalculation to fix "Wrong Place" clicks
        // This syncs the map math with the CSS size
        setTimeout(() => {
            map.invalidateSize();
            map.fitBounds(bounds);
        }, 200);

        // 5. Add Pins
        this.loadLocations();

        // 6. Editor Controls
        if (this.isEditable) {
            this.setupEditorControls();
        }
    }

    async loadLocations() {
        const { data } = await supabase.from('locations').select('*').eq('map_id', this.currentMapData.id);
        if (data) data.forEach(loc => this.addMarker(loc));
    }

    addMarker(loc) {
        // Simple CRS: [y, x]
        const marker = L.marker([loc.y, loc.x]).addTo(this.map);
        
        const content = `
            <div class="location-display">
                <b>${loc.name}</b><br>
                ${this.isEditable ? `<button onclick="window.mapComponents['${this.container.id}'].deletePin(${loc.id})">Delete</button>` : ''}
            </div>
        `;
        marker.bindPopup(content);
        
        // Store reference for deletion
        marker._dbId = loc.id;
    }

    setupEditorControls() {
        // Right-click to add pin
        this.map.on('contextmenu', (e) => {
            const { lat, lng } = e.latlng;
            
            const popupContent = `
                <div class="pin-form">
                    <label>Name</label>
                    <input type="text" id="new-pin-name">
                    <button onclick="window.mapComponents['${this.container.id}'].savePin(${lat}, ${lng})">Save Pin</button>
                </div>
            `;
            
            L.popup()
                .setLatLng(e.latlng)
                .setContent(popupContent)
                .openOn(this.map);
        });
    }

    async savePin(lat, lng) {
        const nameInput = document.getElementById('new-pin-name');
        if (!nameInput || !nameInput.value) return alert("Name required");

        const { data, error } = await supabase.from('locations').insert([{
            map_id: this.currentMapData.id,
            name: nameInput.value,
            x: lng,
            y: lat
        }]).select();

        if (error) {
            alert("Error: " + error.message);
        } else {
            this.addMarker(data[0]);
            this.map.closePopup();
        }
    }

    async deletePin(id) {
        if (!confirm("Delete pin?")) return;
        const { error } = await supabase.from('locations').delete().eq('id', id);
        
        if (!error) {
            this.map.eachLayer(layer => {
                if (layer._dbId === id) this.map.removeLayer(layer);
            });
        }
    }
}

// Global init
window.mapComponents = window.mapComponents || {};
export function initMapComponents() {
    document.querySelectorAll('[data-map-component]').forEach(el => {
        // Ensure unique ID
        if (!el.id) el.id = 'map-' + Math.random().toString(36).substr(2, 9);
        window.mapComponents[el.id] = new MapComponent(el);
    });
}