// Unified Reservation System for LiftWork
document.addEventListener('DOMContentLoaded', function() {
    // ----- SYSTEM DE NOTIFICATIONS -----
    // Créer le conteneur de notifications s'il n'existe pas déjà
    if (!document.getElementById('lw-notifications')) {
        const notificationsContainer = document.createElement('div');
        notificationsContainer.id = 'lw-notifications';
        notificationsContainer.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;width:300px;';
        document.body.appendChild(notificationsContainer);
    }
    
    // Fonction pour afficher une notification
    function showNotification(message, type = 'info', duration = 3000) {
        const container = document.getElementById('lw-notifications');
        const notification = document.createElement('div');
        notification.className = `lw-notification lw-notification-${type}`;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'assertive');
        notification.setAttribute('aria-atomic', 'true');
        notification.style.cssText = `
            padding: 12px 15px;
            margin-bottom: 10px;
            border-radius: 4px;
            background-color: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#cce5ff'};
            color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#004085'};
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
            opacity: 0;
            transform: translateX(50px);
        `;
        notification.innerHTML = message;
        container.appendChild(notification);
        
        // Animation d'entrée
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Disparition automatique
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(50px)';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
    // ----- STATE MANAGEMENT -----
    const slotsPerDayByMode = { turbo: 6, express: 4, standard: 2 }; // Standard: 2 créneaux, Express: 4 créneaux, Turbo: 6 créneaux
    const bookingState = {
        mode: null, // turbo, express, standard
        date: null,
        timeSlots: [], // Liste de créneaux sélectionnés
        serviceType: null,
        description: '',
        contact: {
            name: '',
            phone: '',
            email: ''
        },
        vehicle: {
            plate: '',
            model: '',
            photos: []
        }
    };

    // ----- DOM ELEMENTS -----
    // Steps
    const stepIndicators = document.querySelectorAll('.lw-step');
    const stepContents = document.querySelectorAll('.lw-step-content');
    
    // Mode buttons
    const turboBtn = document.querySelector('.turbo-btn');
    const expressBtn = document.querySelector('.express-btn');
    const standardBtn = document.querySelector('.standard-btn');
    
    // Navigation buttons
    const toStep3Btn = document.getElementById('to-step3');
    const toStep4Btn = document.getElementById('to-step4');
    const backToStep1Btn = document.getElementById('back-to-step1');
    const backToStep2Btn = document.getElementById('back-to-step2');
    const backToStep3Btn = document.getElementById('back-to-step3');
    const confirmBookingBtn = document.getElementById('confirm-booking');
    
    // Period and time filters
    const periodBtns = document.querySelectorAll('.lw-period-btn');
    const timeBtns = document.querySelectorAll('.lw-time-btn');
    
    // Calendar navigation
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const currentMonthLabel = document.getElementById('current-month');
    
    // Service details
    const serviceTypeRadios = document.querySelectorAll('input[name="service-type"]');
    const problemDescriptionInput = document.getElementById('problem-description');
    const fullnameInput = document.getElementById('fullname');
    const phoneInput = document.getElementById('phone');
    const emailInput = document.getElementById('email');
    
    // Vehicle info
    const vehiclePlateInput = document.getElementById('vehicle-plate');
    const vehicleModelInput = document.getElementById('vehicle-model');
    const vehiclePhotosInput = document.getElementById('vehicle-photos');
    const photoPreviewDiv = document.getElementById('photo-preview');
    
    // Summary elements
    const summaryModeBadge = document.getElementById('summary-mode-badge');
    const summaryDatetime = document.getElementById('summary-datetime');
    const summaryService = document.getElementById('summary-service');
    const summaryDescription = document.getElementById('summary-description');
    const summaryName = document.getElementById('summary-name');
    const summaryContact = document.getElementById('summary-contact');
    
    // Mode selection label
    const modeSelectedLabel = document.getElementById('mode-selected-label');
    
    // Selected date label
    const selectedDateLabel = document.getElementById('selected-date-label');

    // ----- NAVIGATION FUNCTIONS -----
    function navigateToStep(stepNumber) {
        // Update the active indicator
        stepIndicators.forEach((indicator, index) => {
            const stepNum = index + 1;
            if (index < stepNumber - 1) {
                indicator.classList.add('completed');
                indicator.classList.remove('active');
                indicator.setAttribute('aria-current', 'false');
                indicator.setAttribute('aria-label', `Étape ${stepNum} terminée`);
            } else if (index === stepNumber - 1) {
                indicator.classList.add('active');
                indicator.classList.remove('completed');
                indicator.setAttribute('aria-current', 'step');
                indicator.setAttribute('aria-label', `Étape ${stepNum} active`);
            } else {
                indicator.classList.remove('active', 'completed');
                indicator.setAttribute('aria-current', 'false');
                indicator.setAttribute('aria-label', `Étape ${stepNum}`);
            }
        });
        
        // Update the active content
        stepContents.forEach((content, index) => {
            if (index === stepNumber - 1) {
                content.classList.add('active');
                content.setAttribute('aria-hidden', 'false');
                content.setAttribute('tabindex', '0'); // Rend l'élément focusable
                
                // Annoncer le changement d'étape aux lecteurs d'écran
                const stepAnnouncer = document.getElementById('lw-step-announcer') || (() => {
                    const el = document.createElement('div');
                    el.id = 'lw-step-announcer';
                    el.className = 'sr-only';
                    el.setAttribute('aria-live', 'polite');
                    document.body.appendChild(el);
                    return el;
                })();
                stepAnnouncer.textContent = `Vous êtes maintenant à l'étape ${index + 1}`;                
                
                // Scroll to top of the step
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            } else {
                content.classList.remove('active');
                content.setAttribute('aria-hidden', 'true');
                content.setAttribute('tabindex', '-1'); // Rend l'élément non-focusable
            }
        });
        
        // Additional actions based on the step
        if (stepNumber === 2) {
            updateModeLabel();
            initializeCalendar();
        } else if (stepNumber === 4) {
            updateSummary();
        } else if (stepNumber === 5) {
            updatePaymentAmount();
        }
    }

    // ----- PAIEMENT -----
    function updatePaymentAmount() {
        const paymentAmountEl = document.getElementById('payment-amount');
        let amount = 0;
        switch(bookingState.mode) {
            case 'turbo':
                amount = 69; break;
            case 'express':
                amount = 49; break;
            case 'standard':
                amount = 29; break;
        }
        if (paymentAmountEl) paymentAmountEl.textContent = amount + ' CHF';
    }

    // ----- MODE SELECTION -----
    function selectMode(mode) {
        bookingState.mode = mode;
        
        // Navigate to the next step
        navigateToStep(2);
    }
    
    function updateModeLabel() {
        if (bookingState.mode) {
            let modeText;
            switch (bookingState.mode) {
                case 'turbo':
                    modeText = 'Turbo';
                    break;
                case 'express':
                    modeText = 'Express';
                    break;
                case 'standard':
                    modeText = 'Standard';
                    break;
            }
            modeSelectedLabel.textContent = `(${modeText})`;
        }
    }

    // ----- CALENDAR FUNCTIONS -----
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();
    
    function initializeCalendar() {
        updateCalendar();
    }
    
    function updateCalendar() {
        // Update month label
        const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
                            "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
        currentMonthLabel.textContent = `${monthNames[currentMonth]} ${currentYear}`;
        
        // Clear previous days
        const calendarGrid = document.querySelector('.lw-calendar-grid');
        calendarGrid.innerHTML = '';
        
        // Add day headers
        const dayHeaders = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
        dayHeaders.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'lw-calendar-day-header';
            dayHeader.textContent = day;
            calendarGrid.appendChild(dayHeader);
        });
        
        // Get first day of the month
        const firstDay = new Date(currentYear, currentMonth, 1);
        let startingDay = firstDay.getDay() || 7; // Convert Sunday (0) to 7 for easier calculation
        startingDay--; // Adjust to 0-based index
        
        // Get number of days in the month
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const daysInMonth = lastDay.getDate();
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'lw-calendar-day disabled';
            calendarGrid.appendChild(emptyDay);
        }
        
        // Add days of the month - ne pas afficher les jours passés et appliquer les filtres
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateObj = new Date(currentYear, currentMonth, day);
            dateObj.setHours(0, 0, 0, 0);
            
            // Ne pas ajouter les jours déjà passés
            if (dateObj < today) {
                continue; // Passer au jour suivant sans l'afficher
            }
            
            // Vérifier si le jour correspond au filtre sélectionné
            const dayOfWeek = dateObj.getDay(); // 0 = dimanche, 6 = samedi
            
            if (bookingState.periodType === 'saturday' && dayOfWeek !== 6) {
                // Si on a choisi "Uniquement le samedi" et que ce n'est pas un samedi
                continue; // Ne pas afficher ce jour
            }
            
            if (bookingState.periodType === 'workdays' && (dayOfWeek === 0 || dayOfWeek === 6)) {
                // Si on a choisi "Dès que possible" (jours ouvrables) et que c'est un weekend
                continue; // Ne pas afficher ce jour
            }
            
            // Créer l'élément pour ce jour
            const dayElement = document.createElement('div');
            dayElement.className = 'lw-calendar-day';
            dayElement.addEventListener('click', () => selectDate(dateObj));
            
            // Filtrer selon le mode de réservation (Turbo, Express)
            if (bookingState.mode === 'turbo' && dateObj > new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)) {
                dayElement.classList.add('disabled');
            } else if (bookingState.mode === 'express' && dateObj > new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) {
                dayElement.classList.add('disabled');
            }
            
            // Check if the day is already selected
            if (bookingState.date && 
                dateObj.getDate() === bookingState.date.getDate() &&
                dateObj.getMonth() === bookingState.date.getMonth() &&
                dateObj.getFullYear() === bookingState.date.getFullYear()) {
                dayElement.classList.add('selected');
            }
            
            // Add day number and day name
            const dayNumber = document.createElement('span');
            dayNumber.textContent = day;
            dayElement.appendChild(dayNumber);
            
            const dayName = document.createElement('small');
            const options = { weekday: 'short' };
            dayName.textContent = dateObj.toLocaleDateString('fr-FR', options).slice(0, 3);
            dayElement.appendChild(dayName);
            
            calendarGrid.appendChild(dayElement);
        }
    }
    
    function selectDate(date) {
        bookingState.date = date;
        
        // Clear previous selection
        document.querySelectorAll('.lw-calendar-day').forEach(day => {
            day.classList.remove('selected');
        });
        
        // Find and select the current date
        const allDays = document.querySelectorAll('.lw-calendar-day:not(.disabled)');
        allDays.forEach(day => {
            const dayNumber = parseInt(day.querySelector('span').textContent);
            if (dayNumber === date.getDate()) {
                day.classList.add('selected');
            }
        });
        
        // Update selected date label
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        selectedDateLabel.textContent = `pour le ${date.toLocaleDateString('fr-FR', options)}`;
        
        // Update time slots (simulate for demo)
        updateTimeSlots(date);
        
        // Appliquer le filtre matin/après-midi automatiquement selon le bouton actif
        const activeTimeBtn = document.querySelector('.lw-time-btn.active');
        if (activeTimeBtn) {
            filterByTime(activeTimeBtn.dataset.time);
        }
        // Show time slots section with smooth animation
        const timeslotsSection = document.querySelector('.lw-timeslots');
        timeslotsSection.style.display = 'block';
        timeslotsSection.style.opacity = '0';
        setTimeout(() => {
            timeslotsSection.style.transition = 'opacity 0.3s ease';
            timeslotsSection.style.opacity = '1';
        }, 10);
        
        // Scroll to time slots
        setTimeout(() => {
            timeslotsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
        
        // Enable next button
        toStep3Btn.disabled = false;
    }
    
    // Stocker les créneaux déjà pris (en simulation)
    const bookedSlots = {}; // Format: {'2025-05-21': ['09:00', '14:00']}
    
    // --- API RÉELLE (à activer quand le backend est prêt) ---
    // Configuration de l'API
    const API_CONFIG = {
        // URL de base de l'API pointant vers notre nouveau backend
        baseUrl: 'http://localhost:3001',
        // Endpoint pour obtenir les créneaux disponibles
        getSlotsEndpoint: '/slots',
        // Endpoint pour réserver un créneau
        bookEndpoint: '/book',
        // Activé : utilise l'API au lieu de la simulation locale
        enabled: true
    };
    
    // Fonction pour récupérer les créneaux disponibles depuis l'API
    async function fetchSlotsFromAPI(date) {
        if (!API_CONFIG.enabled) return null; // Utiliser la simulation si API désactivée
        
        try {
            const dateStr = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
            const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.getSlotsEndpoint}?date=${dateStr}`);
            
            if (!response.ok) {
                console.error('Erreur lors de la récupération des créneaux:', response.status);
                return null;
            }
            
            return await response.json();
        } catch (error) {
            console.error('Erreur réseau:', error);
            return null;
        }
    }
    
    // Fonction pour réserver un créneau via l'API
    async function bookSlotViaAPI(date, slot, clientInfo, vehicleInfo) {
        if (!API_CONFIG.enabled) return { success: true }; // Simuler succès si API désactivée
        
        try {
            const dateStr = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
            const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.bookEndpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    date: dateStr,
                    slot: slot,
                    client: clientInfo,
                    vehicle: vehicleInfo
                })
            });
            
            if (!response.ok) {
                // Si le créneau est déjà pris (code 409)
                if (response.status === 409) {
                    return { success: false, error: 'Ce créneau est déjà réservé.' };
                }
                
                console.error('Erreur lors de la réservation:', response.status);
                return { success: false, error: 'Erreur lors de la réservation.' };
            }
            
            return await response.json();
        } catch (error) {
            console.error('Erreur réseau:', error);
            return { success: false, error: 'Erreur de connexion au serveur.' };
        }
    }
    
    // --- LOGIQUE MÉTIER : Calcul des créneaux disponibles ---
    function getAvailableSlots(date, mode, bookedSlotsObj) {
        const isSaturday = date.getDay() === 6;
        let slotTimes;
        if (isSaturday) {
            slotTimes = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00'];
        } else {
            slotTimes = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
        }
        const dateKey = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        const bookedSlotsForDate = bookedSlotsObj[dateKey] || [];
        // Retourne la liste des slots disponibles (non réservés)
        return slotTimes.filter(time => !bookedSlotsForDate.includes(time));
    }

    // --- DOM : Affichage des slots disponibles ---
    async function updateTimeSlots(date) {
        // Clear previous slots
        const slotsContainer = document.querySelector('.lw-slots-container');
        slotsContainer.innerHTML = '';
        const isSaturday = date.getDay() === 6;
        const dateKey = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        
        // --- Récupération des créneaux (API ou simulation) ---
        let availableSlots = [];
        let bookedSlotsForDate = [];
        
        if (API_CONFIG.enabled) {
            // Récupérer les créneaux depuis l'API si activée
            const apiResponse = await fetchSlotsFromAPI(date);
            
            if (apiResponse && apiResponse.available && apiResponse.booked) {
                // API a répondu correctement
                availableSlots = apiResponse.available;
                bookedSlotsForDate = apiResponse.booked;
            } else {
                // Fallback sur la simulation si l'API échoue
                bookedSlotsForDate = bookedSlots[dateKey] || [];
                availableSlots = getAvailableSlots(date, bookingState.mode, bookedSlots);
            }
        } else {
            // Utiliser la simulation locale
            bookedSlotsForDate = bookedSlots[dateKey] || [];
            availableSlots = getAvailableSlots(date, bookingState.mode, bookedSlots);
        }
        
        // Trier les créneaux en deux groupes : matin (<12h) et après-midi (>=12h)
        const morningSlots = availableSlots.filter(time => parseInt(time.split(':')[0], 10) < 12);
        const afternoonSlots = availableSlots.filter(time => parseInt(time.split(':')[0], 10) >= 12);
        if (isSaturday) {
            // Afficher un message spécial pour le samedi
            const messageDiv = document.createElement('div');
            messageDiv.className = 'lw-slot-message';
            messageDiv.innerHTML = '<i class="fas fa-info-circle"></i> Le samedi, nous sommes disponibles uniquement le matin de 9h à 12h.';
            slotsContainer.appendChild(messageDiv);
        }
        // Afficher d'abord les créneaux du matin
        morningSlots.forEach((time) => {
            const slotItem = document.createElement('div');
            slotItem.className = 'lw-slot-item available';
            slotItem.innerHTML = `
                <span class="lw-slot-time">${time}</span>
                <span class="lw-slot-duration">45 min</span>
            `;
            slotItem.addEventListener('click', () => selectTimeSlot(time, dateKey));
            slotsContainer.appendChild(slotItem);
        });
        // Puis les créneaux de l'après-midi
        afternoonSlots.forEach((time) => {
            const slotItem = document.createElement('div');
            slotItem.className = 'lw-slot-item available';
            slotItem.innerHTML = `
                <span class="lw-slot-time">${time}</span>
                <span class="lw-slot-duration">45 min</span>
            `;
            slotItem.addEventListener('click', () => selectTimeSlot(time, dateKey));
            slotsContainer.appendChild(slotItem);
        });
        // Afficher aussi les slots déjà réservés (grisés)
        bookedSlotsForDate.forEach((time) => {
            const slotItem = document.createElement('div');
            slotItem.className = 'lw-slot-item unavailable';
            slotItem.innerHTML = `
                <span class="lw-slot-time">${time}</span>
                <span class="lw-slot-unavailable">Déjà réservé</span>
            `;
            slotsContainer.appendChild(slotItem);
        });
    }
    
    function selectTimeSlot(time, dateKey) {
        // Limite dynamique selon le mode
        const mode = bookingState.mode || 'standard';
        const maxSlots = slotsPerDayByMode[mode] || 1;
        if (bookingState.timeSlots.length >= maxSlots && !bookingState.timeSlots.includes(time)) {
            // Message plus convivial pour la limite de créneaux
            showNotification(`Vous avez atteint la limite de ${maxSlots} créneau(x) pour le mode ${mode}. Pour réserver plus de créneaux, choisissez un mode supérieur.`, 'error');
            return;
        }
        // Vérifier si le créneau est déjà sélectionné
        const timeIndex = bookingState.timeSlots.indexOf(time);
        
        if (timeIndex === -1) {
            // Ajouter le créneau s'il n'est pas déjà sélectionné
            bookingState.timeSlots.push(time);
        } else {
            // Retirer le créneau s'il était déjà sélectionné
            bookingState.timeSlots.splice(timeIndex, 1);
        }
        
        // Trier les créneaux pour qu'ils apparaissent dans l'ordre chronologique
        bookingState.timeSlots.sort();
        
        // Mettre à jour l'affichage de tous les créneaux
        const allSlots = document.querySelectorAll('.lw-slot-item.available');
        allSlots.forEach(slot => {
            const slotTime = slot.querySelector('.lw-slot-time').textContent;
            
            // Activer/désactiver la classe "selected" en fonction de la présence dans timeSlots
            if (bookingState.timeSlots.includes(slotTime)) {
                slot.classList.add('selected');
            } else {
                slot.classList.remove('selected');
            }
        });
        
        // Activer le bouton "Continuer" uniquement si au moins un créneau est sélectionné
        toStep3Btn.disabled = bookingState.timeSlots.length === 0;
        
        // Afficher le nombre de créneaux sélectionnés et la durée totale
        const selectedSlotsCount = document.getElementById('selected-slots-count');
        if (selectedSlotsCount) {
            if (bookingState.timeSlots.length > 0) {
                // Calculer la durée totale (45 minutes par créneau)
                const totalDuration = bookingState.timeSlots.length * 45; // en minutes
                const hours = Math.floor(totalDuration / 60);
                const minutes = totalDuration % 60;
                
                // Formater le texte de durée
                let durationText = '';
                if (hours > 0) {
                    durationText += `${hours}h`;
                    if (minutes > 0) durationText += `${minutes}min`;
                } else {
                    durationText += `${minutes}min`;
                }
                
                // Afficher le nombre de créneaux et la durée
                selectedSlotsCount.innerHTML = `
                    <span class="slots-count">${bookingState.timeSlots.length} créneau(x)</span>
                    <span class="slots-duration">${durationText}</span>
                `;
                selectedSlotsCount.style.display = 'flex';
            } else {
                selectedSlotsCount.style.display = 'none';
            }
        }
    }

    // ----- FORM HANDLING -----
    function updateServiceDetails() {
        // Get service type
        serviceTypeRadios.forEach(radio => {
            if (radio.checked) {
                bookingState.serviceType = radio.value;
            }
        });
        
        // Get description
        bookingState.description = problemDescriptionInput.value;
        
        // Get contact info
        bookingState.contact.name = fullnameInput.value;
        bookingState.contact.phone = phoneInput.value;
        bookingState.contact.email = emailInput.value;
    }
    
    function updateVehicleInfo() {
        bookingState.vehicle.plate = vehiclePlateInput.value;
        bookingState.vehicle.model = vehicleModelInput.value;
    }
    
    function handlePhotoUpload(event) {
        const files = event.target.files;
        
        // Clear the preview div
        photoPreviewDiv.innerHTML = '';
        
        // Store file references
        bookingState.vehicle.photos = Array.from(files);
        
        // Create preview elements
        Array.from(files).forEach((file, index) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const previewItem = document.createElement('div');
                previewItem.className = 'lw-preview-item';
                
                const img = document.createElement('img');
                img.src = e.target.result;
                
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-btn';
                removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                removeBtn.addEventListener('click', () => removePhoto(index));
                
                previewItem.appendChild(img);
                previewItem.appendChild(removeBtn);
                
                photoPreviewDiv.appendChild(previewItem);
            };
            
            reader.readAsDataURL(file);
        });
    }
    
    function removePhoto(index) {
        // Remove the photo from the state
        bookingState.vehicle.photos.splice(index, 1);
        
        // Reset the input and regenerate the preview
        vehiclePhotosInput.value = '';
        
        // Clear the preview div
        photoPreviewDiv.innerHTML = '';
        
        // Regenerate preview elements
        bookingState.vehicle.photos.forEach((file, i) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const previewItem = document.createElement('div');
                previewItem.className = 'lw-preview-item';
                
                const img = document.createElement('img');
                img.src = e.target.result;
                
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-btn';
                removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                removeBtn.addEventListener('click', () => removePhoto(i));
                
                previewItem.appendChild(img);
                previewItem.appendChild(removeBtn);
                
                photoPreviewDiv.appendChild(previewItem);
            };
            
            reader.readAsDataURL(file);
        });
    }

    // ----- SUMMARY UPDATE -----
    function updateSummary() {
        // Résumé intelligent (étape 4)
        if (summaryModeBadge) summaryModeBadge.textContent = bookingState.mode || '-';
        if (summaryDatetime) summaryDatetime.textContent = bookingState.date ? `${bookingState.date} ${bookingState.timeSlots.join(', ')}` : '-';
        if (summaryService) summaryService.textContent = bookingState.serviceType || '-';
        if (summaryDescription) summaryDescription.textContent = bookingState.description || '-';
        if (summaryName) summaryName.textContent = bookingState.contact.name || '-';
        if (summaryContact) summaryContact.textContent = `${bookingState.contact.phone || '-'} / ${bookingState.contact.email || '-'}`;
    
        // Update mode badge
        summaryModeBadge.className = 'lw-mode-badge';
        summaryModeBadge.classList.add(bookingState.mode);
        summaryModeBadge.textContent = bookingState.mode.charAt(0).toUpperCase() + bookingState.mode.slice(1);
        
        // Update date and time
        if (bookingState.date && bookingState.timeSlots.length > 0) {
            const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
            const dateStr = bookingState.date.toLocaleDateString('fr-FR', options);
            const timesStr = bookingState.timeSlots.join(', ');
            summaryDatetime.textContent = `${dateStr}, ${timesStr}`;
            
            // Ajouter la durée totale estimée
            const totalDuration = bookingState.timeSlots.length * 45; // 45 min par créneau
            const hours = Math.floor(totalDuration / 60);
            const minutes = totalDuration % 60;
            
            // Créer l'élément pour la durée si nécessaire
            let summaryDuration = document.getElementById('summary-duration');
            if (!summaryDuration) {
                summaryDuration = document.createElement('p');
                summaryDuration.id = 'summary-duration';
                summaryDuration.className = 'summary-duration';
                summaryDatetime.parentNode.appendChild(summaryDuration);
            }
            
            // Définir le texte de durée
            let durationText = 'Durée estimée: ';
            if (hours > 0) {
                durationText += `${hours}h`;
                if (minutes > 0) durationText += ` ${minutes}min`;
            } else {
                durationText += `${minutes}min`;
            }
            summaryDuration.textContent = durationText;
        }
        
        // Update service
        if (bookingState.serviceType) {
            let serviceText;
            switch (bookingState.serviceType) {
                case 'repair':
                    serviceText = 'Réparation';
                    break;
                case 'maintenance':
                    serviceText = 'Entretien';
                    break;
                case 'diagnostic':
                    serviceText = 'Diagnostic';
                    break;
            }
            summaryService.textContent = serviceText;
        }
        
        // Update description
        summaryDescription.textContent = bookingState.description || 'Aucune description fournie';
        
        // Update contact info
        summaryName.textContent = bookingState.contact.name;
        summaryContact.textContent = `${bookingState.contact.phone} | ${bookingState.contact.email}`;
    }

    // ----- BOOKING CONFIRMATION -----
    function isValidSwissPlate(plate) {
        // Format : 2 lettres (canton), espace, 3 à 6 chiffres
        return /^[A-Z]{2} ?\d{3,6}$/i.test(plate.trim());
    }

    // --- LOGIQUE MÉTIER : Validation centralisée ---
    function validateBookingFields(bookingState) {
        const errors = {};
        if (!bookingState.contact.name || bookingState.contact.name.trim().length < 2) {
            errors.name = 'Nom obligatoire';
        }
        if (!bookingState.contact.phone || bookingState.contact.phone.trim().length < 6) {
            errors.phone = 'Téléphone obligatoire';
        }
        if (!bookingState.contact.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(bookingState.contact.email)) {
            errors.email = 'Email valide obligatoire';
        }
        if (!bookingState.serviceType) {
            errors.serviceType = 'Type de service obligatoire';
        }
        if (!bookingState.timeSlots || bookingState.timeSlots.length === 0) {
            errors.timeSlots = 'Sélectionnez au moins un créneau';
        }
        if (!isValidSwissPlate(bookingState.vehicle.plate || '')) {
            errors.plate = 'Plaque suisse invalide (ex : VS 30726)';
        }
        return errors;
    }

    // --- DOM : Affichage des erreurs ---
    function showValidationErrors(errors) {
        // Nettoyage des anciens messages
        document.querySelectorAll('.lw-error').forEach(e => e.remove());
        
        // Réinitialiser tous les états d'erreur
        [fullnameInput, phoneInput, emailInput, vehiclePlateInput, vehicleModelInput].forEach(input => {
            input.setAttribute('aria-invalid', 'false');
            const id = input.id + '-error';
            if (document.getElementById(id)) {
                document.getElementById(id).remove();
            }
        });
        
        if (errors.name) {
            const err = document.createElement('div');
            err.id = 'fullname-error';
            err.className = 'lw-error';
            err.setAttribute('role', 'alert');
            err.style = 'color:#e6007a;font-size:0.98em;margin-top:2px;margin-bottom:7px;';
            err.textContent = errors.name;
            fullnameInput.setAttribute('aria-invalid', 'true');
            fullnameInput.setAttribute('aria-describedby', 'fullname-error');
            fullnameInput.parentNode.insertBefore(err, fullnameInput.nextSibling);
        }
        if (errors.phone) {
            const err = document.createElement('div');
            err.id = 'phone-error';
            err.className = 'lw-error';
            err.setAttribute('role', 'alert');
            err.style = 'color:#e6007a;font-size:0.98em;margin-top:2px;margin-bottom:7px;';
            err.textContent = errors.phone;
            phoneInput.setAttribute('aria-invalid', 'true');
            phoneInput.setAttribute('aria-describedby', 'phone-error');
            phoneInput.parentNode.insertBefore(err, phoneInput.nextSibling);
        }
        if (errors.email) {
            const err = document.createElement('div');
            err.id = 'email-error';
            err.className = 'lw-error';
            err.setAttribute('role', 'alert');
            err.style = 'color:#e6007a;font-size:0.98em;margin-top:2px;margin-bottom:7px;';
            err.textContent = errors.email;
            emailInput.setAttribute('aria-invalid', 'true');
            emailInput.setAttribute('aria-describedby', 'email-error');
            emailInput.parentNode.insertBefore(err, emailInput.nextSibling);
        }
        if (errors.serviceType) {
            const err = document.createElement('div');
            err.className = 'lw-error';
            err.style = 'color:#e6007a;font-size:0.98em;margin-top:2px;margin-bottom:7px;';
            err.textContent = errors.serviceType;
            const stInput = document.querySelector('input[name="service-type"]');
            stInput.parentNode.insertBefore(err, stInput.nextSibling);
        }
        if (errors.timeSlots) {
            const slotSection = document.querySelector('.lw-time-slot-section') || document.body;
            const err = document.createElement('div');
            err.className = 'lw-error';
            err.style = 'color:#e6007a;font-size:0.98em;margin-top:2px;margin-bottom:7px;';
            err.textContent = errors.timeSlots;
            slotSection.parentNode.insertBefore(err, slotSection.nextSibling);
        }
        if (errors.plate) {
            const err = document.createElement('div');
            err.id = 'vehicle-plate-error';
            err.className = 'lw-error';
            err.setAttribute('role', 'alert');
            err.style = 'color:#e6007a;font-size:0.98em;margin-top:2px;margin-bottom:7px;';
            err.textContent = errors.plate;
            vehiclePlateInput.setAttribute('aria-invalid', 'true');
            vehiclePlateInput.setAttribute('aria-describedby', 'vehicle-plate-error');
            vehiclePlateInput.parentNode.insertBefore(err, vehiclePlateInput.nextSibling);
        }
    }

    async function confirmBooking() {
        // Validation centralisée
        updateVehicleInfo(); // Mettre à jour la plaque avant validation
        const errors = validateBookingFields(bookingState);
        if (Object.keys(errors).length > 0) {
            showValidationErrors(errors);
            return;
        }

        // Update vehicle info before confirmation
        updateVehicleInfo();
        
        // --- Réserver les créneaux (API ou simulation) ---
        if (bookingState.date && bookingState.timeSlots.length > 0) {
            const dateKey = `${bookingState.date.getFullYear()}-${(bookingState.date.getMonth()+1).toString().padStart(2, '0')}-${bookingState.date.getDate().toString().padStart(2, '0')}`;
            
            if (API_CONFIG.enabled) {
                // Utiliser l'API pour réserver les créneaux
                let allSuccess = true;
                for (const timeSlot of bookingState.timeSlots) {
                    const result = await bookSlotViaAPI(
                        bookingState.date, 
                        timeSlot, 
                        bookingState.contact, 
                        bookingState.vehicle
                    );
                    
                    if (!result.success) {
                        allSuccess = false;
                        // Message d'erreur plus convivial
                        showNotification(`Ce créneau n'est plus disponible. Merci de sélectionner un autre horaire.`, 'error', 5000);
                        return; // Arrêter si un créneau échoue
                    }
                }
                
                if (!allSuccess) return; // Ne pas continuer si erreur
                
                // Notification de succès
                showNotification('Votre réservation a été confirmée avec succès!', 'success', 5000);
                
            } else {
                // Simulation locale (comme avant)
                // Vérifier si le tableau existe déjà pour cette date
                if (!bookedSlots[dateKey]) {
                    bookedSlots[dateKey] = [];
                }
                
                // Ajouter chaque créneau aux créneaux réservés
                bookingState.timeSlots.forEach(timeSlot => {
                    if (!bookedSlots[dateKey].includes(timeSlot)) {
                        bookedSlots[dateKey].push(timeSlot);
                        console.log(`Créneau ${timeSlot} réservé pour ${dateKey}`);
                    }
                });
                
                // Notification de succès
                showNotification('Votre réservation a été confirmée avec succès!', 'success', 5000);
            }
        }
        
        // Show confirmation step
        document.getElementById('step4').classList.remove('active');
        document.getElementById('confirmation').classList.add('active');
        
        // Update booking details in confirmation
        document.getElementById('booking-reference').textContent = `LW-${Math.floor(1000 + Math.random() * 9000)}`;
        
        if (bookingState.date && bookingState.timeSlot) {
            const options = { day: 'numeric', month: 'numeric', year: 'numeric' };
            document.getElementById('booking-datetime').textContent = `${bookingState.date.toLocaleDateString('fr-FR', options)} à ${bookingState.timeSlot}`;
        }
        
        document.getElementById('booking-mode').textContent = bookingState.mode.charAt(0).toUpperCase() + bookingState.mode.slice(1);
    }

    // ----- FILTER FUNCTIONS -----
    function filterByPeriod(period) {
        // Clear current selections
        periodBtns.forEach(btn => btn.classList.remove('active'));
        
        // Set the active period
        Array.from(periodBtns).find(btn => btn.dataset.period === period).classList.add('active');
        
        // Stocker le type de période sélectionnée
        bookingState.periodType = period;
        
        // Filter dates based on period
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Réinitialiser le mois affiché à la date actuelle
        currentMonth = today.getMonth();
        currentYear = today.getFullYear();
        
        // Afficher le calendrier avec une animation
        const calendar = document.querySelector('.lw-calendar');
        if (calendar.style.display === 'none') {
            calendar.style.display = 'block';
            calendar.style.opacity = '0';
            setTimeout(() => {
                calendar.style.transition = 'opacity 0.3s ease';
                calendar.style.opacity = '1';
            }, 10);
        }
        
        updateCalendar();
    }
    
    function filterByTime(time) {
        // Clear current selections
        timeBtns.forEach(btn => btn.classList.remove('active'));
        
        // Set the active time
        Array.from(timeBtns).find(btn => btn.dataset.time === time).classList.add('active');
        
        // Filter slots based on time preference (matin ou après-midi)
        const slotItems = document.querySelectorAll('.lw-slot-item.available');
        
        slotItems.forEach(slot => {
            const slotTime = parseInt(slot.querySelector('.lw-slot-time').textContent.split(':')[0]);
            
            slot.style.display = 'flex'; // Reset visibility
            
            switch (time) {
                case 'morning':
                    if (slotTime > 12) {
                        slot.style.display = 'none';
                    }
                    break;
                case 'afternoon':
                    if (slotTime < 12) {
                        slot.style.display = 'none';
                    }
                    break;
            }
        });
    }

    // ----- EVENT LISTENERS -----
    // Navigation directe via indicateurs d'étapes
    document.querySelectorAll('.lw-step-clickable').forEach(step => {
        step.addEventListener('click', () => {
            const stepNumber = parseInt(step.dataset.step);
            
            // Vérifier si les étapes précédentes sont complètes
            let canNavigate = true;
            
            // Pour accéder à l'étape 2, il faut avoir sélectionné un mode
            if (stepNumber >= 2 && !bookingState.mode) {
                canNavigate = false;
                showNotification('Merci de sélectionner d\'abord un mode de réservation (Standard, Express ou Turbo)', 'error');
            }
            
            // Pour accéder à l'étape 3, il faut avoir sélectionné une date et un créneau
            if (stepNumber >= 3 && (!bookingState.date || !bookingState.timeSlot)) {
                canNavigate = false;
                showNotification('Merci de sélectionner d\'abord une date et un horaire qui vous conviennent', 'error');
            }
            
            // Pour accéder à l'étape 4, il faut avoir rempli les détails du service
            if (stepNumber >= 4 && (!bookingState.serviceType || !bookingState.contact.name || !bookingState.contact.phone)) {
                canNavigate = false;
                showNotification('Merci de compléter les informations concernant votre véhicule et vos coordonnées', 'error');
            }
            
            // L'étape 5 (confirmation) n'est accessible qu'après confirmation
            if (stepNumber === 5) {
                // On ne peut pas accéder directement à l'étape de confirmation
                canNavigate = false;
            }
            
            if (canNavigate) {
                navigateToStep(stepNumber);
            }
        });
    });
    
    // Mode selection - cartes classiques
    turboBtn.addEventListener('click', () => selectMode('turbo'));
    expressBtn.addEventListener('click', () => selectMode('express'));
    standardBtn.addEventListener('click', () => selectMode('standard'));
    
    // Mode selection - tableaux de tarification
    document.querySelector('.lw-btn-reserve.turbo-btn').addEventListener('click', () => selectMode('turbo'));
    document.querySelector('.lw-btn-reserve.express-btn').addEventListener('click', () => selectMode('express'));
    document.querySelector('.lw-btn-reserve.standard-btn').addEventListener('click', () => selectMode('standard'));
    
    // Navigation between steps
    backToStep1Btn.addEventListener('click', () => navigateToStep(1));
    backToStep2Btn.addEventListener('click', () => navigateToStep(2));
    backToStep3Btn.addEventListener('click', () => navigateToStep(3));
    
    toStep3Btn.addEventListener('click', () => navigateToStep(3));
    toStep4Btn.addEventListener('click', () => {
        updateServiceDetails();
        navigateToStep(4);
    });
    // Navigation vers paiement
    const toStep5Btn = document.getElementById('to-step5');
    if (toStep5Btn) toStep5Btn.addEventListener('click', () => navigateToStep(5));
    const payAndConfirmBtn = document.getElementById('pay-and-confirm');
    const backToStep4Btn = document.getElementById('back-to-step4');
    // Gestion dynamique du formulaire de paiement
    // --- Paiement suisse simulé ---
    let paymentStatus = 'pending';
    const paymentMethods = [
      { label: 'Payer avec Twint', color: '#e67c00' },
      { label: 'Payer par QR-facture', color: '#4285f4' },
      { label: 'IBAN', color: '#222' },
      { label: 'Payer par carte de crédit', color: '#34a853' }
    ];
    const paymentDiv = document.createElement('div');
    // Ajout dynamique à l'étape 4 — sous la carte de résumé
    const step4 = document.querySelector('.lw-step-content#step4');
    if (step4) {
      if (step4.querySelector('.lw-payment-sim')) step4.querySelector('.lw-payment-sim').remove();
      paymentDiv.classList.add('lw-payment-sim');
      step4.appendChild(paymentDiv);
    }

    const cardForm = document.getElementById('card-form');
    const paypalSim = document.getElementById('paypal-sim');
    const paypalConnectBtn = document.getElementById('paypal-connect');
    const paypalSuccess = document.getElementById('paypal-success');
    const paymentMethodRadios = document.getElementsByName('payment-method');

    function showPaymentForm() {
        const method = Array.from(paymentMethodRadios).find(r=>r.checked).value;
        if (method === 'carte') {
            cardForm.style.display = '';
            paypalSim.style.display = 'none';
        } else {
            cardForm.style.display = 'none';
            paypalSim.style.display = '';
        }
    }
    paymentMethodRadios.forEach(radio => {
        radio.addEventListener('change', showPaymentForm);
    });
    showPaymentForm();

    let paypalConnected = false;
    if (paypalConnectBtn) {
        paypalConnectBtn.addEventListener('click', function() {
            paypalConnected = true;
            paypalSuccess.style.display = '';
            setTimeout(()=>{paypalSuccess.style.display='none';}, 1500);
        });
    }

    if (payAndConfirmBtn) payAndConfirmBtn.addEventListener('click', function(e) {
        const method = Array.from(paymentMethodRadios).find(r=>r.checked).value;
        if (method === 'carte') {
            // Validation simple
            const num = document.getElementById('card-number').value.trim();
            const exp = document.getElementById('card-expiry').value.trim();
            const cvc = document.getElementById('card-cvc').value.trim();
            const name = document.getElementById('card-name').value.trim();
            if (!/^\d{16,19}$/.test(num.replace(/\s/g,'')) || !/^\d{2}\/\d{2}$/.test(exp) || !/^\d{3,4}$/.test(cvc) || name.length<2) {
                alert('Merci de remplir correctement toutes les informations de carte bancaire.');
                return;
            }
            confirmBooking();
        } else if (method === 'paypal') {
            if (!paypalConnected) {
                alert('Merci de vous connecter à PayPal avant de confirmer.');
                return;
            }
            confirmBooking();
        }
    });
    if (backToStep4Btn) backToStep4Btn.addEventListener('click', () => navigateToStep(4));
    
    // Period and time filters
    periodBtns.forEach(btn => {
        btn.addEventListener('click', () => filterByPeriod(btn.dataset.period));
    });
    
    timeBtns.forEach(btn => {
        btn.addEventListener('click', () => filterByTime(btn.dataset.time));
    });
    
    // Calendar navigation
    prevMonthBtn.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        updateCalendar();
    });
    
    nextMonthBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        updateCalendar();
    });
    
    // Ajout de la fonctionnalité du bouton "Changer de date"
    document.getElementById('change-date').addEventListener('click', function() {
        // Cacher la section des créneaux avec un effet de fondu
        const timeslotsSection = document.querySelector('.lw-timeslots');
        timeslotsSection.style.opacity = '0';
        
        setTimeout(() => {
            timeslotsSection.style.display = 'none';
            
            // Afficher la section du calendrier avec un effet de fondu
            const calendarSection = document.querySelector('.lw-calendar-section');
            calendarSection.style.display = 'block';
            
            setTimeout(() => {
                calendarSection.style.opacity = '1';
                
                // Défiler jusqu'au calendrier pour une meilleure expérience utilisateur
                calendarSection.scrollIntoView({ behavior: 'smooth' });
            }, 50);
        }, 300);
    });
    
    // Photo upload
    vehiclePhotosInput.addEventListener('change', handlePhotoUpload);
    
    // Home button (in confirmation)
    document.querySelector('.lw-home-btn').addEventListener('click', () => {
        window.location.reload();
    });
    
    // Fonctionnalités pour l'étape 3 - Détails de l'intervention

    // Mise à jour du résumé en haut de l'étape 3
    function updateStep3Summary() {
        // Récupération des données des étapes précédentes
        const planType = bookingState.plan || 'Standard';
        const dateStr = bookingState.date ? new Date(bookingState.date).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }) : '';
        
        const timeStr = bookingState.slots && bookingState.slots.length > 0 ? 
            bookingState.slots[0].time : '';
        
        const duration = bookingState.plan === 'Standard' ? '2 heures' : 
                        bookingState.plan === 'Express' ? '1 heure' : 
                        bookingState.plan === 'Turbo' ? '30 minutes' : '1 heure';
        
        // Mise à jour des éléments HTML
        document.getElementById('summary-plan-type').textContent = planType;
        document.getElementById('summary-date-time').textContent = dateStr + (timeStr ? ', ' + timeStr : '');
        document.getElementById('summary-duration').textContent = duration;
    }

    // Compteur de caractères pour la description du problème
    const problemDescription = document.getElementById('problem-description');
    const charCounter = document.getElementById('char-counter');

    if (problemDescription && charCounter) {
        problemDescription.addEventListener('input', function() {
            const currentLength = this.value.length;
            const maxLength = this.getAttribute('maxlength') || 500;
            charCounter.textContent = currentLength + '/' + maxLength + ' caractères';
            
            // Changer la couleur si on approche de la limite
            if (currentLength > maxLength * 0.9) {
                charCounter.style.color = '#dc3545';
            } else {
                charCounter.style.color = '#6c757d';
            }
        });
    }

    // Gestion des cartes de sélection du type d'intervention
    const serviceCards = document.querySelectorAll('.lw-card-option');
    const serviceRadios = document.querySelectorAll('.service-radio');

    serviceCards.forEach(card => {
        card.addEventListener('click', function() {
            // Retirer la sélection de toutes les cartes
            serviceCards.forEach(c => {
                c.style.borderColor = '#e9ecef';
                c.style.boxShadow = 'none';
            });
            
            // Appliquer la sélection à la carte courante
            this.style.borderColor = '#007bff';
            this.style.boxShadow = '0 0 0 3px rgba(0, 123, 255, 0.25)';
            
            // Cocher le radio associé
            const radio = this.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
                bookingState.serviceType = radio.value;
            }
            
            // Active le bouton Continuer si toutes les validations passent
            validateStep3Form();
        });
    });

    // Référence au bouton de l'étape 3
    const step3ContinueBtn = document.getElementById('to-step4');

    // Fonction de validation d'email avec regex
    function isValidEmail(email) {
        const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return re.test(email);
    }

    // Fonction de validation de numéro de téléphone français
    function isValidPhone(phone) {
        const re = /^(?:\+33|0)[1-9](\d{2}){4}$/;
        return re.test(phone.replace(/\s/g, ''));
    }

    function validateStep3Form() {
        // Vérifier si un type de service est sélectionné
        const serviceSelected = Array.from(serviceRadios).some(radio => radio.checked);
        
        // Vérifier les champs obligatoires
        const nameValid = fullnameInput.value.trim().length > 2;
        const phoneValid = isValidPhone(phoneInput.value);
        const emailValid = isValidEmail(emailInput.value);
        
        // Afficher ou masquer les messages d'erreur
        document.querySelectorAll('.error-message').forEach(msg => msg.style.display = 'none');
        
        if (!nameValid && fullnameInput.value.trim() !== '') {
            fullnameInput.nextElementSibling.style.display = 'block';
        }
        
        if (!phoneValid && phoneInput.value.trim() !== '') {
            phoneInput.nextElementSibling.style.display = 'block';
        }
        
        if (!emailValid && emailInput.value.trim() !== '') {
            emailInput.nextElementSibling.style.display = 'block';
        }
        
        // Mettre en évidence les champs avec erreur
        fullnameInput.style.borderColor = nameValid || fullnameInput.value.trim() === '' ? '#e9ecef' : '#dc3545';
        phoneInput.style.borderColor = phoneValid || phoneInput.value.trim() === '' ? '#e9ecef' : '#dc3545';
        emailInput.style.borderColor = emailValid || emailInput.value.trim() === '' ? '#e9ecef' : '#dc3545';
        
        // Activer ou désactiver le bouton Continuer
        step3ContinueBtn.disabled = !(serviceSelected && nameValid && phoneValid && emailValid);
    }

    // Ajouter des écouteurs d'événements pour les champs de formulaire
    [fullnameInput, phoneInput, emailInput, problemDescription].forEach(input => {
        if (input) {
            input.addEventListener('input', validateStep3Form);
            
            // Ajouter un effet visuel lors du focus
            input.addEventListener('focus', function() {
                this.style.borderColor = '#007bff';
            });
            
            input.addEventListener('blur', function() {
                // Si le champ est valide, remettre la bordure par défaut
                validateStep3Form();
            });
        }
    });

    // Transitions entre étapes pour l'étape 3
    document.getElementById('to-step3').addEventListener('click', function() {
        // Mettre à jour le résumé de l'étape 3 avec les informations des étapes précédentes
        updateStep3Summary();
    });

    // Navigation de l'étape 3 vers l'étape 4
    document.getElementById('to-step4').addEventListener('click', function() {
        // Sauvegarder les données de l'étape 3
        bookingState.contactInfo = {
            name: fullnameInput.value,
            phone: phoneInput.value,
            email: emailInput.value,
            description: problemDescription.value,
            serviceType: Array.from(serviceRadios).find(radio => radio.checked)?.value || ''
        };
        
        // Passer à l'étape 4
        showStep(4);
        
        // Mettre à jour le récapitulatif avec toutes les informations collectées
        updateSummary();
    });

    // Fonction pour mettre à jour le récapitulatif complet à l'étape 4
    function updateSummary() {
        // Mise à jour du badge de mode de réservation
        const summaryModeBadge = document.getElementById('summary-mode-badge');
        summaryModeBadge.textContent = bookingState.plan || 'Standard';
        summaryModeBadge.className = 'lw-mode-badge ' + (bookingState.plan || 'standard').toLowerCase();
        
        // Mise à jour de la date et l'heure
        const dateStr = bookingState.date ? new Date(bookingState.date).toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }) : '';
        
        const timeStr = bookingState.slots && bookingState.slots.length > 0 ? 
            bookingState.slots[0].time : '';
        
        document.getElementById('summary-datetime').textContent = dateStr + (timeStr ? ', ' + timeStr : '');
        
        // Mise à jour du type d'intervention et description
        document.getElementById('summary-service').textContent = {
            'repair': 'Réparation',
            'maintenance': 'Entretien',
            'diagnostic': 'Diagnostic'
        }[bookingState.contactInfo?.serviceType] || 'Non spécifié';
        
        document.getElementById('summary-description').textContent = 
            bookingState.contactInfo?.description || 'Aucune description fournie';
        
        // Mise à jour des informations de contact
        document.getElementById('summary-name').textContent = bookingState.contactInfo?.name || '';
        document.getElementById('summary-contact').innerHTML = 
            `${bookingState.contactInfo?.email || ''}<br>${bookingState.contactInfo?.phone || ''}`;
    }
    
    // Le calendrier sera initialisé seulement après la sélection d'un filtre de période
    // initializeCalendar();
});
