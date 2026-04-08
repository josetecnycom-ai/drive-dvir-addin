geotab.addin.DriveDVIR = function (api, state) {
    let currentDevice = null;
    let currentDriver = null;
    const defectListId = 'b28E9'; // Hardcoded ID de la lista de defectos
    
    // DOM Elements
    let elVehicleName = null;
    let elLoading = null;
    let elInspectionForm = null;
    let elDefectsContainer = null;
    let elDefectsList = null;
    let elSuccessMessage = null;
    let elErrorMessage = null;
    let elErrorText = null;

    const renderDefects = () => {
        elDefectsList.innerHTML = '';
        
        api.call("Get", {
            typeName: "Defect",
            search: { defectListSearch: { id: defectListId } }
        }, function(defects) {
            if (!defects || defects.length === 0) {
                elDefectsList.innerHTML = '<li>No se encontraron defectos para esta lista.</li>';
                elLoading.classList.add('hidden');
                elInspectionForm.classList.remove('hidden');
                return;
            }
            
            defects.forEach(defect => {
                const li = document.createElement('li');
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = 'defect-' + defect.id;
                checkbox.value = defect.id;
                checkbox.classList.add('defect-checkbox');
                
                const label = document.createElement('label');
                label.htmlFor = 'defect-' + defect.id;
                label.textContent = defect.name;
                
                li.appendChild(checkbox);
                li.appendChild(label);
                
                elDefectsList.appendChild(li);
            });
            
            elLoading.classList.add('hidden');
            elInspectionForm.classList.remove('hidden');
        }, function(error) {
            showError("Error cargando defectos: " + error.message || error);
        });
    };

    const submitDVIR = (isSafe) => {
        elInspectionForm.classList.add('hidden');
        elLoading.classList.remove('hidden');
        
        let defectLog = {
            device: { id: currentDevice.id },
            driver: { id: currentDriver.id },
            dateTime: new Date().toISOString(),
            isSafeToOperate: isSafe
        };

        let remark = document.getElementById('inspection-comments').value;
        if(remark) {
           defectLog.remark = remark; 
        }

        if (!isSafe) {
            const selectedDefects = Array.from(document.querySelectorAll('.defect-checkbox:checked'))
                .map(cb => ({
                    defect: { id: cb.value },
                    repairStatus: "NotRepaired"
                }));
            
            if(selectedDefects.length === 0) {
                showError("Debes seleccionar al menos un defecto si el vehículo no es seguro.");
                return;
            }

            defectLog.defectRepairs = selectedDefects;
        }

        api.call("Add", {
            typeName: "DVIRLog",
            entity: defectLog
        }, function(result) {
            elLoading.classList.add('hidden');
            elSuccessMessage.classList.remove('hidden');
        }, function(error) {
            showError("No se pudo enviar la inspección: " + (error.message || error));
        });
    };

    const showError = (msg) => {
        elLoading.classList.add('hidden');
        elInspectionForm.classList.add('hidden');
        elErrorText.textContent = msg;
        elErrorMessage.classList.remove('hidden');
    };

    return {
        initialize: function (api, state, callback) {
            // Asignar variables del DOM aquí ya que el HTML estará listo
            elVehicleName = document.getElementById('vehicle-name');
            elLoading = document.getElementById('loading');
            elInspectionForm = document.getElementById('inspection-form');
            elDefectsContainer = document.getElementById('defects-container');
            elDefectsList = document.getElementById('defects-list');
            elSuccessMessage = document.getElementById('success-message');
            elErrorMessage = document.getElementById('error-message');
            elErrorText = document.getElementById('error-text');

            // Setup listeners
            document.getElementById('btn-show-defects').addEventListener('click', () => {
                elDefectsContainer.classList.remove('hidden');
                document.getElementById('btn-show-defects').style.display = 'none';
            });
            
            document.getElementById('btn-safe').addEventListener('click', () => {
                if(confirm("¿Confirmas que el vehículo es seguro y no tiene defectos?")) {
                    submitDVIR(true);
                }
            });
            
            document.getElementById('btn-submit-defects').addEventListener('click', () => {
                submitDVIR(false);
            });
            
            document.getElementById('btn-reset').addEventListener('click', () => {
                document.getElementById('btn-show-defects').style.display = 'block';
                elDefectsContainer.classList.add('hidden');
                
                // Uncheck todo
                Array.from(document.querySelectorAll('.defect-checkbox')).forEach(cb => cb.checked = false);
                document.getElementById('inspection-comments').value = '';
                
                elSuccessMessage.classList.add('hidden');
                elInspectionForm.classList.remove('hidden');
            });
            
            document.getElementById('btn-retry').addEventListener('click', () => {
                elErrorMessage.classList.add('hidden');
                elInspectionForm.classList.remove('hidden');
            });

            callback();
        },

        focus: function (api, state) {
            // En Drive app, state nos da la información del contexto (dispositivo y usuario activo)
            currentDriver = state.driver || (state.deviceInfo && state.deviceInfo.driver); 
            currentDevice = state.device || (state.deviceInfo && state.deviceInfo.device);

            if (!currentDevice || !currentDevice.id) {
                showError("No hay un vehículo seleccionado actualmente. Selecciona un vehículo en la App de Drive.");
                return;
            }
            if (!currentDriver || !currentDriver.id) {
                 // En algunos entornos el conductor está en state.activeUser
                 currentDriver = state.activeUser || state.user;
                 if(!currentDriver || !currentDriver.id) {
                     showError("No se pudo identificar al conductor.");
                     return;
                 }
            }

            // Conseguir nombre del vehículo
            api.call("Get", {
                typeName: "Device",
                search: { id: currentDevice.id }
            }, function(devices) {
                if(devices && devices.length > 0) {
                    elVehicleName.textContent = devices[0].name || "Vehículo " + currentDevice.id;
                } else {
                    elVehicleName.textContent = "Vehículo " + currentDevice.id;
                }
            }, function(e){
                elVehicleName.textContent = "Vehículo " + currentDevice.id;
            });

            elSuccessMessage.classList.add('hidden');
            elErrorMessage.classList.add('hidden');
            elInspectionForm.classList.add('hidden');
            elLoading.classList.remove('hidden');

            // Cargar defectos
            renderDefects();
        },

        blur: function (api, state) {
            // Guardar estado si es necesario
        }
    };
};
