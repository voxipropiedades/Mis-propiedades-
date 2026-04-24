/**
 * MÓDULO DE BÚSQUEDA INTELIGENTE Y AUTOCOMPLETADO
 * Búsqueda avanzada de clientes militares y de efectivo
 * Versión: 1.0
 * Fecha: 24 de abril de 2026
 */

// ===== ÍNDICE DE BÚSQUEDA EN MEMORIA =====
let searchIndex = {
    militares: [],
    efectivo: [],
    propiedades: [],
    lastUpdated: null
};

/**
 * Construir índice de búsqueda para optimizar búsquedas
 * Se ejecuta automáticamente al cargar datos
 */
function buildSearchIndex() {
    searchIndex = {
        militares: [],
        efectivo: [],
        propiedades: [],
        lastUpdated: Date.now()
    };

    // Indexar militares
    if (voxiData.milis) {
        voxiData.milis.forEach((m, idx) => {
            searchIndex.militares.push({
                id: m.id,
                nombre: m.nombre || '',
                tel: m.tel || '',
                rango: m.rangoMilitar || '',
                estado: m.estado || 'Disponible',
                status: m.status || '',
                index: idx,
                type: 'militar',
                searchText: (m.nombre + ' ' + m.tel + ' ' + (m.rangoMilitar || '')).toLowerCase()
            });
        });
    }

    // Indexar clientes de efectivo
    if (voxiData.grals) {
        voxiData.grals.forEach((g, idx) => {
            searchIndex.efectivo.push({
                id: g.id,
                nombre: g.nombre || '',
                tel: g.tel || '',
                status: g.status || '',
                index: idx,
                type: 'efectivo',
                searchText: (g.nombre + ' ' + g.tel).toLowerCase()
            });
        });
    }

    // Indexar propiedades
    if (voxiData.props) {
        voxiData.props.forEach((p, idx) => {
            searchIndex.propiedades.push({
                id: p.id,
                titulo: p.titulo || '',
                ubicacion: p.ubicacion || '',
                tipo: p.tipo || '',
                estatus: p.estatus || '',
                precio: p.precio || '',
                index: idx,
                type: 'propiedad',
                searchText: (p.titulo + ' ' + p.ubicacion + ' ' + p.tipo).toLowerCase()
            });
        });
    }
}

/**
 * Búsqueda simple por nombre o teléfono
 * @param {string} query - Texto de búsqueda
 * @param {string} type - Tipo de búsqueda: 'todos', 'militares', 'efectivo', 'propiedades'
 * @returns {array} Resultados de búsqueda
 */
function searchClients(query, type = 'todos') {
    if (!query || query.length < 1) return [];

    const queryLower = query.toLowerCase();
    let results = [];

    if (type === 'todos' || type === 'militares') {
        results = results.concat(
            searchIndex.militares.filter(m => m.searchText.includes(queryLower))
        );
    }

    if (type === 'todos' || type === 'efectivo') {
        results = results.concat(
            searchIndex.efectivo.filter(e => e.searchText.includes(queryLower))
        );
    }

    if (type === 'todos' || type === 'propiedades') {
        results = results.concat(
            searchIndex.propiedades.filter(p => p.searchText.includes(queryLower))
        );
    }

    // Ordenar por relevancia (coincidencia exacta primero)
    results.sort((a, b) => {
        const aExact = a.searchText.startsWith(queryLower) ? 0 : 1;
        const bExact = b.searchText.startsWith(queryLower) ? 0 : 1;
        return aExact - bExact;
    });

    return results.slice(0, 20); // Limitar a 20 resultados
}

/**
 * Búsqueda avanzada con múltiples criterios
 * @param {object} criteria - Criterios de búsqueda
 * @returns {array} Resultados filtrados
 */
function advancedSearch(criteria) {
    let results = [];

    // Búsqueda de militares
    if (criteria.type === 'militar' || criteria.type === 'todos') {
        results = results.concat(
            searchIndex.militares.filter(m => {
                if (criteria.nombre && !m.nombre.toLowerCase().includes(criteria.nombre.toLowerCase())) return false;
                if (criteria.tel && !m.tel.includes(criteria.tel)) return false;
                if (criteria.rango && m.rango !== criteria.rango) return false;
                if (criteria.estado && m.estado !== criteria.estado) return false;
                return true;
            })
        );
    }

    // Búsqueda de clientes de efectivo
    if (criteria.type === 'efectivo' || criteria.type === 'todos') {
        results = results.concat(
            searchIndex.efectivo.filter(e => {
                if (criteria.nombre && !e.nombre.toLowerCase().includes(criteria.nombre.toLowerCase())) return false;
                if (criteria.tel && !e.tel.includes(criteria.tel)) return false;
                if (criteria.status && e.status !== criteria.status) return false;
                return true;
            })
        );
    }

    // Búsqueda de propiedades
    if (criteria.type === 'propiedad' || criteria.type === 'todos') {
        results = results.concat(
            searchIndex.propiedades.filter(p => {
                if (criteria.titulo && !p.titulo.toLowerCase().includes(criteria.titulo.toLowerCase())) return false;
                if (criteria.ubicacion && !p.ubicacion.toLowerCase().includes(criteria.ubicacion.toLowerCase())) return false;
                if (criteria.tipo && p.tipo !== criteria.tipo) return false;
                if (criteria.estatus && p.estatus !== criteria.estatus) return false;
                return true;
            })
        );
    }

    return results;
}

/**
 * Obtener sugerencias de autocompletado mientras se escribe
 * @param {string} query - Texto parcial
 * @param {string} type - Tipo: 'militares', 'efectivo', 'todos'
 * @returns {array} Sugerencias ordenadas por relevancia
 */
function getAutocompleteSuggestions(query, type = 'todos') {
    if (!query || query.length < 2) return [];

    const queryLower = query.toLowerCase();
    let suggestions = [];

    if (type === 'todos' || type === 'militares') {
        searchIndex.militares.forEach(m => {
            if (m.nombre.toLowerCase().includes(queryLower)) {
                suggestions.push({
                    text: m.nombre,
                    subtext: `${m.rango || 'Sin rango'} | ${m.tel || 'Sin tel'}`,
                    type: 'militar',
                    data: m
                });
            }
        });
    }

    if (type === 'todos' || type === 'efectivo') {
        searchIndex.efectivo.forEach(e => {
            if (e.nombre.toLowerCase().includes(queryLower)) {
                suggestions.push({
                    text: e.nombre,
                    subtext: `💵 Efectivo | ${e.tel || 'Sin tel'}`,
                    type: 'efectivo',
                    data: e
                });
            }
        });
    }

    // Ordenar por relevancia
    suggestions.sort((a, b) => {
        const aStart = a.text.toLowerCase().startsWith(queryLower) ? 0 : 1;
        const bStart = b.text.toLowerCase().startsWith(queryLower) ? 0 : 1;
        return aStart - bStart;
    });

    return suggestions.slice(0, 10); // Máximo 10 sugerencias
}

/**
 * Renderizar dropdown de sugerencias
 * @param {string} inputId - ID del input
 * @param {array} suggestions - Array de sugerencias
 * @param {function} onSelect - Callback al seleccionar
 */
function renderSuggestionsDropdown(inputId, suggestions, onSelect) {
    const input = document.getElementById(inputId);
    if (!input) return;

    // Crear o actualizar dropdown
    let dropdown = document.getElementById(inputId + '-dropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = inputId + '-dropdown';
        dropdown.style.cssText = `
            position: absolute;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            max-height: 200px;
            overflow-y: auto;
            width: 100%;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            display: none;
        `;
        input.parentElement.style.position = 'relative';
        input.parentElement.appendChild(dropdown);
    }

    if (suggestions.length === 0) {
        dropdown.style.display = 'none';
        return;
    }

    dropdown.innerHTML = suggestions.map((s, idx) => `
        <div onclick="selectSuggestion('${inputId}', ${idx})" 
             style="padding: 10px; border-bottom: 1px solid #eee; cursor: pointer; font-size: 0.9em; transition: 0.2s;"
             onmouseover="this.style.background = '#f5f5f5'"
             onmouseout="this.style.background = 'white'">
            <div style="font-weight: 900; color: #333;">${s.text}</div>
            <div style="font-size: 0.8em; color: #666;">${s.subtext}</div>
        </div>
    `).join('');

    dropdown.style.display = 'block';
    
    // Guardar sugerencias para selección
    window[inputId + '_suggestions'] = suggestions;
}

/**
 * Seleccionar una sugerencia del dropdown
 */
function selectSuggestion(inputId, index) {
    const suggestions = window[inputId + '_suggestions'];
    if (!suggestions || !suggestions[index]) return;

    const selected = suggestions[index];
    const input = document.getElementById(inputId);
    
    input.value = selected.text;
    
    // Guardar datos del cliente seleccionado
    window[inputId + '_selected'] = selected.data;
    
    // Cerrar dropdown
    const dropdown = document.getElementById(inputId + '-dropdown');
    if (dropdown) dropdown.style.display = 'none';
}

/**
 * Renderizar UI de búsqueda avanzada
 */
function renderAdvancedSearchUI() {
    const searchDiv = document.getElementById('advanced-search-container');
    if (!searchDiv) return;

    const html = `
    <div style="background: white; border-radius: 12px; padding: 14px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <h4 style="margin-top: 0; color: #b71c1c; font-size: 0.9em;">🔍 BÚSQUEDA AVANZADA</h4>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
            <div>
                <label style="font-size: 0.7em; font-weight: 900; color: #666; display: block; margin-bottom: 4px;">TIPO</label>
                <select id="search-type" 
                        style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 8px; font-size: 0.9em;"
                        onchange="updateSearchResults()">
                    <option value="todos">Todos</option>
                    <option value="militares">🪖 Militares</option>
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="propiedades">🏠 Propiedades</option>
                </select>
            </div>
            <div>
                <label style="font-size: 0.7em; font-weight: 900; color: #666; display: block; margin-bottom: 4px;">NOMBRE</label>
                <input type="text" id="search-nombre" placeholder="Ej: Juan..." 
                       style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 8px; font-size: 0.9em;"
                       oninput="updateSearchResults()">
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
                <label style="font-size: 0.7em; font-weight: 900; color: #666; display: block; margin-bottom: 4px;">TELÉFONO</label>
                <input type="text" id="search-tel" placeholder="Ej: 555..." 
                       style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 8px; font-size: 0.9em;"
                       oninput="updateSearchResults()">
            </div>
            <div>
                <label style="font-size: 0.7em; font-weight: 900; color: #666; display: block; margin-bottom: 4px;">ESTADO</label>
                <select id="search-estado" 
                        style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 8px; font-size: 0.9em;"
                        onchange="updateSearchResults()">
                    <option value="">Todos</option>
                    <option value="Disponible">Disponible</option>
                    <option value="Apartado">Apartado</option>
                    <option value="Vendido">Vendido</option>
                </select>
            </div>
        </div>

        <div id="search-results" style="margin-top: 12px; max-height: 300px; overflow-y: auto;"></div>
    </div>
    `;

    searchDiv.innerHTML = html;
}

/**
 * Actualizar resultados de búsqueda
 */
function updateSearchResults() {
    const type = document.getElementById('search-type')?.value || 'todos';
    const nombre = document.getElementById('search-nombre')?.value || '';
    const tel = document.getElementById('search-tel')?.value || '';
    const estado = document.getElementById('search-estado')?.value || '';

    const criteria = {
        type: type,
        nombre: nombre,
        tel: tel,
        estado: estado || undefined
    };

    const results = advancedSearch(criteria);
    const resultsDiv = document.getElementById('search-results');

    if (!resultsDiv) return;

    if (results.length === 0) {
        resultsDiv.innerHTML = '<div style="text-align: center; color: #999; padding: 20px; font-size: 0.85em;">No se encontraron resultados</div>';
        return;
    }

    resultsDiv.innerHTML = results.map(r => {
        let html = '';
        if (r.type === 'militar') {
            html = `
            <div style="background: #f1f8e9; border-left: 4px solid #2e7d32; padding: 10px; border-radius: 8px; margin-bottom: 8px; cursor: pointer;"
                 onclick="goToRecord('prospectos', '${r.id}', '${r.id}')">
                <div style="font-weight: 900; font-size: 0.85em;">🪖 ${r.nombre}</div>
                <div style="font-size: 0.75em; color: #666;">Rango: ${r.rango} | Tel: ${r.tel} | Estado: ${r.estado}</div>
            </div>
            `;
        } else if (r.type === 'efectivo') {
            html = `
            <div style="background: #f5f5f5; border-left: 4px solid #757575; padding: 10px; border-radius: 8px; margin-bottom: 8px; cursor: pointer;"
                 onclick="goToRecord('prospectos', '${r.id}', null, '${r.id}')">
                <div style="font-weight: 900; font-size: 0.85em;">💵 ${r.nombre}</div>
                <div style="font-size: 0.75em; color: #666;">Tel: ${r.tel} | Status: ${r.status}</div>
            </div>
            `;
        } else if (r.type === 'propiedad') {
            html = `
            <div style="background: #e3f2fd; border-left: 4px solid #1565c0; padding: 10px; border-radius: 8px; margin-bottom: 8px; cursor: pointer;"
                 onclick="goToRecord('inventario', '${r.id}', null, '${r.id}')">
                <div style="font-weight: 900; font-size: 0.85em;">🏠 ${r.titulo}</div>
                <div style="font-size: 0.75em; color: #666;">Ubicación: ${r.ubicacion} | Precio: $${r.precio} | Estado: ${r.estatus}</div>
            </div>
            `;
        }
        return html;
    }).join('');
}

/**
 * Inicializar búsqueda inteligente
 * Se ejecuta al cargar la página
 */
function initSmartSearch() {
    buildSearchIndex();
    console.log('✅ Índice de búsqueda construido:', searchIndex);
}

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', () => {
    initSmartSearch();
});

// Reconstruir índice cuando se modifiquen datos
function autoSave_WithIndexUpdate() {
    autoSave();
    buildSearchIndex();
}
