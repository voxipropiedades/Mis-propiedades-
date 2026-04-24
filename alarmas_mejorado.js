/**
 * MÓDULO MEJORADO DE ALARMAS
 * Sistema de alarmas con CRUD completo, notificaciones avanzadas y búsqueda inteligente
 * Versión: 2.0
 * Fecha: 24 de abril de 2026
 */

// ===== CONFIGURACIÓN DE SONIDOS =====
const ALARM_SOUNDS = {
    default: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
    bell: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
    chime: 'https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3',
    alert: 'https://assets.mixkit.co/active_storage/sfx/2871/2871-preview.mp3',
    urgent: 'https://assets.mixkit.co/active_storage/sfx/2872/2872-preview.mp3'
};

// ===== ESTADO GLOBAL DE ALARMAS =====
let activeAlarmAudios = [];
let editingAlertId = null;
let alarmMonitorInterval = null;

/**
 * Crear una nueva alarma con todos los parámetros
 * @param {string} text - Texto de la alarma
 * @param {string} time - Hora en formato HH:MM
 * @param {string} priority - Prioridad (URGENTE, HOY, MAÑANA, SEMANA, PENDIENTE)
 * @param {string} sound - Tipo de sonido (default, bell, chime, alert, urgent)
 * @param {string} clientId - ID del cliente asociado (opcional)
 * @param {string} clientName - Nombre del cliente (opcional)
 */
function createAlarm(text, time, priority, sound = 'default', clientId = null, clientName = null) {
    if (!text || !time) {
        showVoxiToast('❌ Completa el texto y la hora de la alarma');
        return false;
    }

    if (!voxiData.manualAlerts) voxiData.manualAlerts = [];

    const alarm = {
        id: Date.now(),
        text: text,
        time: time,
        priority: priority || '⚪ PENDIENTE',
        sound: sound,
        date: new Date().toISOString(),
        type: 'Recordatorio Manual',
        notified: false,
        notifiedInSession: false,
        clientId: clientId,
        clientName: clientName
    };

    voxiData.manualAlerts.push(alarm);
    autoSave();

    // Notificación inmediata si es prioritaria
    if (priority.includes('URGENTE') || priority.includes('HOY')) {
        sendLocalPush('NUEVA ALARMA CREADA', text + (clientName ? ` (${clientName})` : ''));
    }

    return alarm;
}

/**
 * Editar una alarma existente
 * @param {number} alarmId - ID de la alarma
 * @param {object} updates - Cambios a aplicar
 */
function updateAlarm(alarmId, updates) {
    const alarmIndex = voxiData.manualAlerts.findIndex(a => a.id === alarmId);
    if (alarmIndex === -1) {
        showVoxiToast('❌ Alarma no encontrada');
        return false;
    }

    const alarm = voxiData.manualAlerts[alarmIndex];
    
    // Aplicar actualizaciones
    Object.assign(alarm, updates);
    
    // Resetear notificación para que vuelva a sonar si se cambió la hora
    alarm.notified = false;
    alarm.notifiedInSession = false;

    autoSave();
    showVoxiToast('✅ Alarma actualizada');
    return true;
}

/**
 * Eliminar una alarma
 * @param {number} alarmId - ID de la alarma
 */
function deleteAlarm(alarmId) {
    const alarmIndex = voxiData.manualAlerts.findIndex(a => a.id === alarmId);
    if (alarmIndex === -1) {
        showVoxiToast('❌ Alarma no encontrada');
        return false;
    }

    voxiData.manualAlerts.splice(alarmIndex, 1);
    stopAllAlertSounds();
    autoSave();
    showVoxiToast('✅ Alarma eliminada');
    return true;
}

/**
 * Obtener todas las alarmas de un cliente
 * @param {string} clientId - ID del cliente
 */
function getAlarmsByClient(clientId) {
    if (!voxiData.manualAlerts) return [];
    return voxiData.manualAlerts.filter(a => a.clientId === clientId);
}

/**
 * Enviar notificación push mejorada con vibración y sonido
 * @param {string} title - Título de la notificación
 * @param {string} body - Cuerpo del mensaje
 * @param {string} soundType - Tipo de sonido (default, bell, chime, alert, urgent)
 */
function sendAdvancedPush(title, body, soundType = 'default') {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const alertKey = title + body + new Date().getHours() + new Date().getMinutes();
    
    const options = {
        body: body,
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        tag: 'voxi-alert-advanced',
        requireInteraction: true,
        data: { arrival: Date.now(), soundType: soundType }
    };

    // Vibración del dispositivo (si es soportado)
    if ('vibrate' in navigator) {
        try {
            // Patrón de vibración: [espera, vibra, espera, vibra, espera, vibra]
            navigator.vibrate([300, 100, 300, 100, 300]);
        } catch (e) {
            console.warn('Vibración no soportada:', e);
        }
    }

    // Reproducir sonido de alerta
    playAlarmSound(soundType);

    // Mostrar notificación
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title, options);
        });
    } else {
        new Notification(title, options);
    }

    // Actualizar badge del app
    if ('setAppBadge' in navigator) {
        const count = (voxiData.manualAlerts || []).filter(a => !a.notified).length;
        navigator.setAppBadge(count).catch(() => {});
    }
}

/**
 * Reproducir sonido de alarma
 * @param {string} soundType - Tipo de sonido
 */
function playAlarmSound(soundType = 'default') {
    try {
        const soundUrl = ALARM_SOUNDS[soundType] || ALARM_SOUNDS.default;
        const audio = new Audio(soundUrl);
        
        // Reproducir 3 veces con intervalo
        let playCount = 0;
        const playRepeat = () => {
            audio.play().catch(() => {});
            playCount++;
            if (playCount < 3) {
                setTimeout(playRepeat, 1000);
            } else {
                activeAlarmAudios = activeAlarmAudios.filter(a => a !== audio);
            }
        };
        
        playRepeat();
        activeAlarmAudios.push(audio);
    } catch (e) {
        console.warn('Error reproduciendo sonido:', e);
    }
}

/**
 * Detener todos los sonidos de alarma activos
 */
function stopAllAlertSounds() {
    activeAlarmAudios.forEach(audio => {
        try {
            audio.pause();
            audio.currentTime = 0;
        } catch (e) {}
    });
    activeAlarmAudios = [];
}

/**
 * Iniciar monitoreo de alarmas en tiempo real
 * Verifica cada minuto si hay alarmas que deben activarse
 */
function startAdvancedAlarmMonitor() {
    // Limpiar monitor anterior si existe
    if (alarmMonitorInterval) clearInterval(alarmMonitorInterval);

    alarmMonitorInterval = setInterval(() => {
        if (!voxiData.manualAlerts) return;

        const now = new Date();
        const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                           now.getMinutes().toString().padStart(2, '0');

        voxiData.manualAlerts.forEach((alarm) => {
            // Verificar si la alarma debe activarse
            if (alarm.time === currentTime && !alarm.notified) {
                const clientInfo = alarm.clientName ? ` - ${alarm.clientName}` : '';
                sendAdvancedPush(
                    `ALARMA: ${alarm.priority}`,
                    alarm.text + clientInfo,
                    alarm.sound || 'default'
                );
                alarm.notified = true;
                autoSave();
            }
        });
    }, 60000); // Verificar cada minuto
}

/**
 * Obtener lista de sugerencias de clientes para autocompletado
 * @param {string} query - Texto de búsqueda
 * @returns {array} Lista de clientes coincidentes
 */
function getClientSuggestions(query) {
    if (!query || query.length < 2) return [];

    const queryLower = query.toLowerCase();
    const suggestions = [];

    // Buscar en militares
    if (voxiData.milis) {
        voxiData.milis.forEach(m => {
            if (m.nombre.toLowerCase().includes(queryLower)) {
                suggestions.push({
                    id: m.id,
                    name: m.nombre,
                    type: 'militar',
                    tel: m.tel,
                    rango: m.rangoMilitar || 'Sin rango'
                });
            }
        });
    }

    // Buscar en clientes de efectivo
    if (voxiData.grals) {
        voxiData.grals.forEach(g => {
            if (g.nombre.toLowerCase().includes(queryLower)) {
                suggestions.push({
                    id: g.id,
                    name: g.nombre,
                    type: 'efectivo',
                    tel: g.tel
                });
            }
        });
    }

    return suggestions;
}

/**
 * Renderizar UI mejorada de alarmas con búsqueda inteligente
 * Esta función reemplaza la sección de alarmas en renderAssistant()
 */
function renderAdvancedAlarmsUI() {
    const alertDiv = document.getElementById('assistant-alerts');
    if (!alertDiv) return;

    alertDiv.innerHTML = '';
    
    // Formulario de nueva alarma con búsqueda
    const formHtml = `
    <div style="background: #fff; border-radius: 12px; padding: 14px; margin-bottom: 16px; border: 2px solid #b71c1c;">
        <h4 style="margin-top: 0; color: #b71c1c; font-size: 0.9em;">➕ NUEVA ALARMA</h4>
        
        <div style="margin-bottom: 10px;">
            <label style="font-size: 0.7em; font-weight: 900; color: #666; display: block; margin-bottom: 4px;">DESCRIPCIÓN</label>
            <input type="text" id="new-manual-alert" placeholder="Ej: Falta INE de Juan..." 
                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 8px; font-size: 0.9em;">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
            <div>
                <label style="font-size: 0.7em; font-weight: 900; color: #666; display: block; margin-bottom: 4px;">HORA</label>
                <input type="time" id="alert-time" 
                       style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 8px; font-size: 0.9em;">
            </div>
            <div>
                <label style="font-size: 0.7em; font-weight: 900; color: #666; display: block; margin-bottom: 4px;">PRIORIDAD</label>
                <select id="alert-priority" 
                        style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 8px; font-size: 0.9em;">
                    <option value="🔴 URGENTE">🔴 URGENTE</option>
                    <option value="🟠 HOY">🟠 HOY</option>
                    <option value="🟡 MAÑANA">🟡 MAÑANA</option>
                    <option value="🔵 SEMANA">🔵 SEMANA</option>
                    <option value="⚪ PENDIENTE" selected>⚪ PENDIENTE</option>
                </select>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
            <div>
                <label style="font-size: 0.7em; font-weight: 900; color: #666; display: block; margin-bottom: 4px;">SONIDO</label>
                <select id="alert-sound" 
                        style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 8px; font-size: 0.9em;">
                    <option value="default">🔔 Campana</option>
                    <option value="bell">🔊 Timbre</option>
                    <option value="chime">✨ Chime</option>
                    <option value="alert">⚠️ Alerta</option>
                    <option value="urgent">🚨 Urgente</option>
                </select>
            </div>
            <div>
                <label style="font-size: 0.7em; font-weight: 900; color: #666; display: block; margin-bottom: 4px;">CLIENTE</label>
                <input type="text" id="alert-client" placeholder="Buscar cliente..." 
                       style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 8px; font-size: 0.9em;"
                       oninput="showClientSuggestions(this.value)">
                <div id="client-suggestions" style="position: absolute; background: white; border: 1px solid #ddd; border-radius: 8px; max-height: 150px; overflow-y: auto; width: 200px; display: none; z-index: 1000;"></div>
            </div>
        </div>

        <button onclick="saveAdvancedAlert();" 
                style="background: var(--primary); color: white; border: none; border-radius: 8px; padding: 10px 16px; font-weight: 900; width: 100%; cursor: pointer; font-size: 0.85em;">
            <i class="fas fa-save"></i> GUARDAR ALARMA
        </button>
    </div>
    `;

    alertDiv.innerHTML = formHtml;

    // Listar alarmas existentes
    if (voxiData.manualAlerts && voxiData.manualAlerts.length > 0) {
        let alarmsHtml = '<div style="margin-top: 16px;"><h4 style="color: #b71c1c; font-size: 0.9em; margin-top: 0;">📋 ALARMAS ACTIVAS</h4>';
        
        voxiData.manualAlerts.forEach((alarm, idx) => {
            const statusIcon = alarm.notified ? '✅' : '⏰';
            const clientInfo = alarm.clientName ? `<br><small style="color: #666;">👤 ${alarm.clientName}</small>` : '';
            
            alarmsHtml += `
            <div style="background: #f9f9f9; border-left: 4px solid ${alarm.priority.includes('URGENTE') ? '#d32f2f' : '#2196f3'}; padding: 10px; border-radius: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                <div style="flex: 1;">
                    <div style="font-weight: 900; font-size: 0.85em;">${statusIcon} ${alarm.text}</div>
                    <div style="font-size: 0.75em; color: #666;">🕐 ${alarm.time} | ${alarm.priority}${clientInfo}</div>
                </div>
                <div style="display: flex; gap: 5px;">
                    <button onclick="editingAlertId = ${alarm.id}; renderAdvancedAlarmsUI();" 
                            style="background: #2196f3; color: white; border: none; border-radius: 6px; padding: 6px 10px; font-size: 0.7em; cursor: pointer;">
                        ✏️ EDITAR
                    </button>
                    <button onclick="deleteAlarm(${alarm.id}); renderAdvancedAlarmsUI();" 
                            style="background: #d32f2f; color: white; border: none; border-radius: 6px; padding: 6px 10px; font-size: 0.7em; cursor: pointer;">
                        🗑️ BORRAR
                    </button>
                </div>
            </div>
            `;
        });
        
        alarmsHtml += '</div>';
        alertDiv.innerHTML += alarmsHtml;
    }
}

/**
 * Mostrar sugerencias de clientes mientras se escribe
 */
function showClientSuggestions(query) {
    const sugDiv = document.getElementById('client-suggestions');
    if (!sugDiv) return;

    const suggestions = getClientSuggestions(query);
    
    if (suggestions.length === 0) {
        sugDiv.style.display = 'none';
        return;
    }

    sugDiv.innerHTML = suggestions.map(s => `
        <div onclick="selectClient('${s.id}', '${s.name}', '${s.type}');" 
             style="padding: 8px; border-bottom: 1px solid #eee; cursor: pointer; font-size: 0.85em;">
            <strong>${s.name}</strong><br>
            <small>${s.type === 'militar' ? '🪖 ' + s.rango : '💵 Efectivo'} | ${s.tel || 'Sin tel'}</small>
        </div>
    `).join('');

    sugDiv.style.display = 'block';
}

/**
 * Seleccionar un cliente de las sugerencias
 */
function selectClient(clientId, clientName, clientType) {
    document.getElementById('alert-client').value = clientName;
    document.getElementById('client-suggestions').style.display = 'none';
    // Guardar ID del cliente para la alarma
    window.selectedClientId = clientId;
    window.selectedClientName = clientName;
}

/**
 * Guardar una nueva alarma desde el formulario
 */
function saveAdvancedAlert() {
    const text = document.getElementById('new-manual-alert').value;
    const time = document.getElementById('alert-time').value;
    const priority = document.getElementById('alert-priority').value;
    const sound = document.getElementById('alert-sound').value;
    const clientId = window.selectedClientId || null;
    const clientName = window.selectedClientName || null;

    if (!text) {
        showVoxiToast('❌ Escribe la descripción de la alarma');
        return;
    }

    if (!time) {
        showVoxiToast('❌ Selecciona la hora');
        return;
    }

    createAlarm(text, time, priority, sound, clientId, clientName);
    
    // Limpiar formulario
    document.getElementById('new-manual-alert').value = '';
    document.getElementById('alert-time').value = '';
    document.getElementById('alert-client').value = '';
    window.selectedClientId = null;
    window.selectedClientName = null;

    renderAdvancedAlarmsUI();
}

// Iniciar monitoreo al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    startAdvancedAlarmMonitor();
});
