// main.js

document.addEventListener('DOMContentLoaded', () => {

  // -------------------------------
  // SYMPTOM CHECK PAGE
  // -------------------------------
  const symptomsText = document.getElementById('symptomsText');
  const charCount = document.getElementById('charCount');

  if (symptomsText && charCount) {
    // Character counter
    symptomsText.addEventListener('input', () => {
      charCount.textContent = symptomsText.value.length;
    });

    // Duration chips
    const durationChips = document.querySelectorAll('.chip[data-duration]');
    durationChips.forEach(chip => {
      chip.addEventListener('click', () => {
        durationChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        console.log("Duration selected:", chip.dataset.duration);
        
      });
    });

    // Severity scale
    const severityItems = document.querySelectorAll('.scale-item[data-severity]');
    severityItems.forEach(item => {
      item.addEventListener('click', () => {
        severityItems.forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        console.log("Severity selected:", item.dataset.severity);
      });
    });

    // Body parts (multi-select)
    const bodyParts = document.querySelectorAll('.body-part[data-part]');
    bodyParts.forEach(part => {
      part.addEventListener('click', () => {
        part.classList.toggle('selected');
        console.log("Body part toggled:", part.dataset.part);
      });
    });

    // Context checkboxes (multi-select)
    const checkboxItems = document.querySelectorAll('.checkbox-item[data-context]');
    checkboxItems.forEach(item => {
      item.addEventListener('click', () => {
        item.classList.toggle('checked');
        const checkbox = item.querySelector('.checkbox-box');
        if (item.classList.contains('checked')) {
          if (!checkbox.querySelector('iconify-icon')) {
            checkbox.innerHTML = '<iconify-icon icon="lucide:check" style="font-size:12px;color:var(--primary-foreground)"></iconify-icon>';
          }
        } else {
          checkbox.innerHTML = '';
        }
        console.log("Context toggled:", item.dataset.context);
      });
    });

    // Save Draft button
    const saveDraftBtn = document.querySelector('.btn-secondary');
    if (saveDraftBtn) {
      saveDraftBtn.addEventListener('click', () => {
        const formData = {
          description: symptomsText ? symptomsText.value : '', 
          duration: document.querySelector('.chip.active')?.dataset.duration || '',
          severity: parseInt(document.querySelector('.scale-item.selected')?.dataset.severity || '0'),
          bodyParts: Array.from(document.querySelectorAll('.body-part.selected')).map(p => p.dataset.part),
          context: Array.from(document.querySelectorAll('.checkbox-item.checked')).map(c => c.dataset.context)
        };
        localStorage.setItem('symptomDraft', JSON.stringify(formData));
        alert('Draft saved successfully!');
        console.log("Draft saved:", formData);
      });
    }

    // Load draft
    const draft = localStorage.getItem('symptomDraft');
    if (draft) {
      try {
        const formData = JSON.parse(draft);
        if (formData.symptoms) {
          symptomsText.value = formData.symptoms;
          charCount.textContent = formData.symptoms.length;
        }
        if (formData.duration) {
          durationChips.forEach(c => c.classList.remove('active'));
          const durationChip = document.querySelector(`.chip[data-duration="${formData.duration}"]`);
          if (durationChip) durationChip.classList.add('active');
        }
        if (formData.severity) {
          severityItems.forEach(i => i.classList.remove('selected'));
          const severityItem = document.querySelector(`.scale-item[data-severity="${formData.severity}"]`);
          if (severityItem) severityItem.classList.add('selected');
        }
        if (formData.bodyParts) {
          formData.bodyParts.forEach(part => {
            const bodyPart = document.querySelector(`.body-part[data-part="${part}"]`);
            if (bodyPart) bodyPart.classList.add('selected');
          });
        }
        if (formData.context) {
          formData.context.forEach(ctx => {
            const contextItem = document.querySelector(`.checkbox-item[data-context="${ctx}"]`);
            if (contextItem) {
              contextItem.classList.add('checked');
              const checkbox = contextItem.querySelector('.checkbox-box');
              checkbox.innerHTML = '<iconify-icon icon="lucide:check" style="font-size:12px;color:var(--primary-foreground)"></iconify-icon>';
            }
          });
        }
      } catch (e) {
        console.error('Error loading draft:', e);
      }
    }

    // Submit to backend (optional)
    const submitBtn = document.getElementById('submitBtn');
    if (!submitBtn) return console.error("Submit button not found!");
    
        submitBtn.addEventListener('click', () => {
        console.log("Submit button clicked");

        // Collect form data
        const formData = {
            description: symptomsText ? symptomsText.value : '',
            duration: document.querySelector('.chip.active')?.dataset.duration || '',
            severity: parseInt(document.querySelector('.scale-item.selected')?.dataset.severity || '0'),
            bodyParts: Array.from(document.querySelectorAll('.body-part.selected')).map(p => p.dataset.part),
            context: Array.from(document.querySelectorAll('.checkbox-item.checked')).map(c => c.dataset.context)
        };

        console.log("Preparing to send formData:", formData);

        // Send to backend
        fetch('http://127.0.0.1:8000/symptom-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        })
        .then(async res => {
            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            const data = await res.json();
            console.log("Backend response:", data);

            // Save to sessionStorage
            sessionStorage.setItem('analysisResults', JSON.stringify(data));
            console.log("Saved to sessionStorage");

            // Redirect to summary page
            window.location.href = 'Patient_Summary.html';
        })
        .catch(err => {
            console.error("Error submitting symptom check:", err);
            alert("There was a problem submitting your symptom check. Please try again.");
        });
    });
};

  // -------------------------------
  // RESULTS / SUMMARY PAGE
  // -------------------------------
  const resultsContainer = document.getElementById('diagnosticSummary');
  if (resultsContainer) {
    const resultsStr = sessionStorage.getItem('analysisResults');
    console.log("Loaded from sessionStorage:", resultsStr);
    if (!resultsStr) {
      alert('error in summary generation ! No analysis results found. Please complete the symptom assessment first.');
      window.location.href = 'Symptom_Check.html';
      return;
    }

    try {
      const results = JSON.parse(resultsStr);
      displayResults(results);
    } catch (e) {
      console.error('Error parsing results:', e);
      alert('Error loading results');
    }
  }

  // Display function (used for results page)
  function displayResults(results) {
    document.getElementById('diagnosticSummary').textContent = results.summary || 'Analysis complete';

    const badgesHtml = `
      <span class="badge badge-yellow">${results.diagnostic_alert?.severity || 'Moderate'} Severity</span>
      <span class="badge badge-gray">${results.diagnostic_alert?.contagious ? 'Possibly Contagious' : 'Not Contagious'}</span>
    `;
    document.getElementById('diagnosticBadges').innerHTML = badgesHtml;

    // Tests
    const testsHtml = (results.recommended_tests || []).map((test, idx) => `
      <div class="flex items-center gap-4 p-4 border-b hover-bg">
        <div class="step-number">${idx + 1}</div>
        <div class="flex-1">
          <h4 class="text-sm font-medium">${test.name}</h4>
          <p class="text-xs text-muted-foreground">${test.reason}</p>
        </div>
      </div>
    `).join('');
    document.getElementById('testsContainer').innerHTML = testsHtml || '<div class="p-4"><span class="text-sm text-muted-foreground">No specific tests recommended</span></div>';

    // Remedies
    const remediesHtml = (results.relief_remedies || []).map(remedy => `
      <div class="flex gap-3 items-start">
        <iconify-icon icon="lucide:droplets" style="font-size: 20px; color: var(--primary)"></iconify-icon>
        <div>
          <h4 class="text-sm font-medium">${remedy.remedy}</h4>
          <p class="text-xs text-muted-foreground">${remedy.description}</p>
        </div>
      </div>
    `).join('');
    document.getElementById('remediesContainer').innerHTML = remediesHtml || '<span class="text-sm text-muted-foreground">No specific remedies recommended</span>';

    // Doctors
    const doctorsHtml = (results.recommended_doctors || []).map((doc, idx) => `
      <div class="doctor-card ${idx === 0 ? 'active' : ''}">
        <div class="flex items-start gap-3">
          <img src="https://storage.googleapis.com/banani-avatars/avatar%2F${idx % 2 === 0 ? 'male' : 'female'}%2F35-50%2FEuropean%2F${idx + 1}" alt="${doc.doctor_name}" class="doctor-avatar" />
          <div>
            <h4 class="text-sm font-semibold">${doc.doctor_name}</h4>
            <p class="text-xs text-muted-foreground">${doc.specialty} • ${doc.qualification || 'MD'}</p>
            <div class="flex gap-2 mt-2">
              <span class="badge ${idx === 0 ? 'badge-green' : 'badge-gray'} text-xs">
                ${idx === 0 ? 'Available Today' : 'Available Soon'}
              </span>
            </div>
          </div>
        </div>
        <div class="mt-3 pt-3 border-t flex justify-between items-center">
          <span class="text-xs font-medium ${idx === 0 ? 'text-primary' : 'text-muted-foreground'}">
            ${doc.hospital_name}
          </span>
          <iconify-icon icon="lucide:arrow-right" style="font-size: 14px"></iconify-icon>
        </div>
      </div>
    `).join('');
    document.getElementById('doctorsContainer').innerHTML = doctorsHtml || '<span class="text-sm text-muted-foreground">No specialists found</span>';

    // Clinics
    const clinicsHtml = (results.nearby_clinics || []).map(clinic => `
      <div class="clinic-item">
        <div class="flex justify-between">
          <span class="text-sm font-medium">${clinic.name}</span>
          <span class="text-xs text-muted-foreground">${clinic.distance}</span>
        </div>
        <div class="flex gap-2 mt-1">
          ${clinic.services.map(s => `<span class="clinic-tag">${s}</span>`).join('')}
        </div>
      </div>
    `).join('');
    document.getElementById('clinicsContainer').innerHTML = clinicsHtml;
  }

});
