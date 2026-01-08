---
title: About Hawthorne
layout: doc
order: 5
background_image: /assets/images/tavern_brawl.jpg
---
## Hawthorne Guild: A History

In 1491 DR, the drow sorceress Irisen Rhuvali and her adventuring companions established a settlement near the Delimbyr River and the Greypeak Mountains, for the purposes of creating a new adventurers’ guild. What started as a haphazard collection of tents and makeshift homes occupied by adventurers and villagers soon became the town of Lerwick, home of the newly created Hawthorne Guild.

Lerwick steadily grew as adventurers flocked to join the guild, with the guild and its adventurers tackling threats in the region in its early days. Over the next two years, it became a notable force in the Savage Frontier.  However, in 1494 DR, the guild faced an unprecedented threat: it was learned that the Split Tooth Mountain at the heart of the Greypeak Mountains in truth contained the titan Bohu, one of the primordial beings who had warred with the gods at the dawn of the universe.

Through the use of powerful magic and sacrifice on her part, Irisen had kept Bohu sealed and had established the guild to watch over the area. However, the seal had been weakening over time and nefarious apocalyptic forces had conspired to further compromise the seal in the hopes of unleashing Bohu. The seal ultimately broke, with the titan breaking free and destroying both the Greypeak Mountains and Lerwick.

Thankfully, many inhabitants of Lerwick had been evacuated beforehand. The surviving adventurers of the Hawthorne Guild then banded together and, with the aid of other factions of Faerûn, took the fight to Bohu and its allies. The Hawthorne Guild ultimately triumphed and Bohu was sealed once more. 

However, with the destruction of Lerwick and Bohu’s influence in the area still lingering, the guild needed a new home. Thus the town of Hawthorne was created in the Sword Coast, south of the Trollbark Forest and Winding Water. With Irisen still suffering from the backlash of the broken seal, an old friend of hers returned to act as the guild’s new leader. In the time since, Hawthorne has grown into a small port city and adventurers of the Hawthorne Guild have adventured across Faerûn and even the planes beyond. 

The current year is now 1499 DR, and the next chapter of the guild’s story is up to adventurers like you and others to decide.

## The City of Hawthorne

The city of Hawthorne, located on the Sword Coast south of the Trollbark Forest and Winding Water, is the current headquarters of the guild. As a small port city with a population of over 5,000, Hawthorne enjoys traffic and trade with other towns and cities along the Sword Coast and beyond. 

The city contains multiple districts, including a Residential and Trades District. The city’s Central District contains the guild hall and guild tavern, an All-Faiths Temple, and Hawthorne Yard, headquarters of the city watch. The Central District also has a teleportation hub with a permanent circle for visitors and returning guild members to use to teleport into the city.

The city’s Campus District contains Hawthorne University and the Children of Mercy Hospital, local institutions that offer education and medical aid. The city’s Harbor District not only contains its docks, but beneath the waters is an Underwater District connected to the Elemental Plane of Water. A coliseum is present outside of the city near its gates, for guild members to test their skills against each other in a safe and supervised environment. The city outskirts and surrounding countryside are patrolled by local scouts, the Hawthorne Roses.

Hawthorne is ruled by a council under the leadership of the current guild leader, Bael “Blank” Kaenerra.  While Hawthorne’s individual adventurers largely act independently at their own discretion, the guild itself enjoys good relations with the Emerald Enclave, the Order of the Gauntlet, and the city of New Nivix as a result of mutual assistance offered during past events, including the fight against the titan Bohu.

### Hawthorne Location on Faerun's Sword Coast

<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>

<div id="embed-map" style="width: 100%; height: 600px; border: 2px solid var(--color-border); border-radius: 4px; z-index: 1;"></div>

<script type="module">
    import { supabase } from "{{ '/assets/js/supabaseClient.js' | relative_url }}";

    // 1. CONFIGURATION
    const mapWidth = 4096;
    const mapHeight = 2918;
    
    // FIX 2: Use Liquid 'relative_url' for the image too
    const mapUrl = "{{ '/assets/images/faerun-map.png' | relative_url }}"; 
    
    // --- ZOOM SETTINGS ---
    // Change these numbers to focus on Hawthorne!
    // Format: [Y-Coordinate, X-Coordinate]
    const initialCenter = [1339, 1848]; 
    const initialZoom = 1; 

    // 2. INITIALIZE MAP
    const map = L.map('embed-map', {
        crs: L.CRS.Simple,
        minZoom: -2,       
        maxZoom: 3,
        zoomSnap: 0.5,
        scrollWheelZoom: false, 
        attributionControl: false
    }).setView(initialCenter, initialZoom);

    const bounds = [[0, 0], [mapHeight, mapWidth]];
    L.imageOverlay(mapUrl, bounds).addTo(map);
    map.setMaxBounds(bounds);

    // 3. FETCH PINS (Read Only)
    async function loadPins() {
        // Simple error handling
        try {
            const { data: locations, error } = await supabase.from('locations').select('*');
            if (error) console.error("Supabase Error:", error);
            if (locations) locations.forEach(addMarkerToMap);
        } catch (err) {
            console.error("Map Load Error:", err);
        }
    }

    function addMarkerToMap(loc) {
        const marker = L.marker([loc.y, loc.x]).addTo(map);
        
        const popupContent = `
            <div style="min-width: 150px; font-family: var(--font-body, sans-serif); color: #333;">
                <h3 style="margin-top:0; border-bottom: 1px solid #ccc; color: var(--color-primary, #58180D);">${loc.name}</h3>
                <p style="margin: 10px 0;">${loc.description || ''}</p>
                ${loc.link_url ? `<a href="${loc.link_url}" target="_blank" style="color: var(--color-secondary, #822000);">Read Lore &raquo;</a>` : ''}
            </div>
        `;
        
        marker.bindPopup(popupContent);
    }

    loadPins();

</script>
<span class="image-caption">Interactive Map of Faerûn. Scroll to zoom.</span>

See Also:  [Hawthorne Location Map with Roads](/Guides/assets/images/hawthorne-sword-coast.jpg)
<span class="image-caption">Map of Sword Coast by Wizards of the Coast, Hawthorne location added by @salah_ad_din</span>


## Hawthorne Guild Rules

<div class="image-text-wrapper">
  <div class="hierarchy-explanation" style="flex: 1; min-width: 0;">
    The Hawthorne Guild is known for an unusually tolerant and egalitarian policy in accepting prospective adventurers of any alignment, affiliation, creed, or species provided they agree to cooperate with other Hawthorne adventurers on missions and to follow the guild’s laws and code of conduct. In this regard, it is not unusual to find traditionally “monstrous” species as among the guild’s ranks, which has become a recognizable quality of the guild across Faerûn.

    Any prospective adventurer that wishes to join the guild must first provide some of their blood or another body part (such as hair) as to be used for Scrying or similar magic during emergencies. Guild members are furnished with a distinctive badge of a hawthorn tree (right), a symbol now known across Faerûn.
  </div>  
  <img src="{{ '/assets/thumbnails/guild-badge-300.png' | relative_url }}" alt="Description" class="hierarchy-image" style="flex: 0 0 25%;">
</div>
The city of Hawthorne has a list of laws that guild members are nominally expected to know and follow, but enforcement of specific laws can vary and often is relaxed owing to the rowdy antics that adventurers can often get up to. However, all guild members are expected to adhere to the following guidelines that make up the guild’s code of conduct:

* Cooperate with other guild members on missions.
* Don’t harm other guild members.
* Don’t harm the guild’s reputation.
* Don’t act against the guild’s interests.

Flagrant or repeated violations of the guild’s code of conduct can be grounds for imprisonment, exile, or even execution. Beyond that, the guild tolerates a wide array of activities from its members.

> **IMPORTANT**
>
> In addition to the guild rules above, please also ensure you have fully read and agree to the [Server Rules](/Guides/rules/server-rules)
