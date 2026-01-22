/**
 * map-widget.js (Fixed Coordinates Version)
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
        
        // ResizeObserver ensures map matches container even if CSS changes late
        this.resizeObserver = new ResizeObserver(() => {
            if (this.map) {
                this.map.invalidateSize();
            }
        });
        
        this.init();
    }

    async init() {
        if (!this.container) return;
        this.resizeObserver.observe(this.container);

        try {
            if (this.mapId) await this.loadMapById(this.mapId);
            else if (this.mapName) await this.loadMapByName(this.mapName);
        } catch (e) {
            console.error(e);
            this.container.innerHTML = `<div class="error">Map Error: ${e.message}</div>`;
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

        // 1. Define bounds matches Image dimensions [Height, Width]
        // For your image: [2250, 4000]
        const h = mapData.height;
        const w = mapData.width;
        const bounds = [[0, 0], [h, w]];

        // 2. CRITICAL FIX: Restore Custom Transformation
        // This maps (0,0) to Top-Left and aligns 1 Lat unit to 1 Pixel Down
        const customCRS = L.extend({}, L.CRS.Simple, {
            transformation: new L.Transformation(1, 0, 1, 0)
        });

        // 3. Initialize Map
        this.map = L.map(this.container, {
            crs: customCRS,          // Use the fixed coordinate system
            minZoom: -3,
            maxZoom: 2,
            maxBounds: bounds,
            maxBoundsViscosity: 1.0,
            attributionControl: false,
            zoomControl: false       // We add it manually to control position
        });

        // 4. Add Image Overlay
        const overlay = L.imageOverlay(mapData.map_file_url, bounds).addTo(this.map);

        // 5. Force fit
        this.map.fitBounds(bounds);

        // 6. Wait for image to load, then snap fit again
        // This ensures exact alignment even if image loads slowly
        const img = overlay.getElement();
        if (img) {
            const snap = () => {
                this.map.invalidateSize();
                this.map.fitBounds(bounds);
            };
            img.onload = snap;
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

    addMarker(loc) {
        // [y, x] is [lat, lng]
        // Coordinates are positive integers (0 to 4000/2250)
        const marker = L.marker([loc.y, loc.x]).addTo(this.map);
        
        let content = `<div class="location-display"><b>${loc.name}</b>`;
        if (loc.description) content += `<p>${loc.description}</p>`;
        if (loc.link_url) content += `<a href="${loc.link_url}" target="_blank">Link</a>`;
        if (this.isEditable) {
            content += `<hr><button class="delete-btn" onclick="window.mapComponents['${this.container.id}'].deletePin(${loc.id})">Delete</button>`;
        }
        content += `</div>`;
        
        marker.bindPopup(content);
        marker._dbId = loc.id;
        this.markers.set(loc.id, marker);
    }

    setupEditorControls() {
        this.map.on('contextmenu', (e) => {
            const { lat, lng } = e.latlng;
            // Round coordinates to prevent weird decimals
            const y = Math.round(lat);
            const x = Math.round(lng);
            
            const content = `
                <div class="pin-form">
                    <label>Name</label>
                    <input type="text" id="new-pin-name">
                    <label>Description</label>
                    <textarea id="new-pin-desc"></textarea>
                    <label>Link</label>
                    <input type="text" id="new-pin-link">
                    <button onclick="window.mapComponents['${this.container.id}'].savePin(${y}, ${x})">Save Pin</button>
                </div>
            `;
            L.popup().setLatLng(e.latlng).setContent(content).openOn(this.map);
        });
    }

    async savePin(lat, lng) {
        const name = document.getElementById('new-pin-name').value;
        const desc = document.getElementById('new-pin-desc').value;
        const link = document.getElementById('new-pin-link').value;
        
        if (!name) return alert("Name required");

        const { data, error } = await supabase.from('locations').insert([{
            map_id: this.currentMapData.id,
            name: name,
            description: desc,
            link_url: link,
            x: lng, // x is longitude (width)
            y: lat  // y is latitude (height)
        }]).select();

        if (error) alert(error.message);
        else {
            this.addMarker(data[0]);
            this.map.closePopup();
        }
    }

    async deletePin(id) {
        if (!confirm("Delete pin?")) return;
        const { error } = await supabase.from('locations').delete().eq('id', id);
        if (!error) {
            const marker = this.markers.get(id);
            if (marker) this.map.removeLayer(marker);
        }
    }
}

window.mapComponents = window.mapComponents || {};
export function initMapComponents() {
    document.querySelectorAll('[data-map-component]').forEach(el => {
        if (!el.id) el.id = 'map-' + Math.random().toString(36).substr(2, 9);
        window.mapComponents[el.id] = new MapComponent(el);
    });
}