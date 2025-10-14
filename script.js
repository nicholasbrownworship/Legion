/* === Font Imports === */
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Rajdhani:wght@400;600&display=swap');

/* === Base Layout === */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  user-select: none;
}

body {
  font-family: 'Rajdhani', sans-serif;
  background: radial-gradient(ellipse at center, #02060f 0%, #000 100%);
  color: #d0f0ff;
  min-height: 100vh;
  overflow-x: hidden;
  position: relative;
}

/* Subtle scanline overlay */
body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    to bottom,
    rgba(255,255,255,0.02),
    rgba(255,255,255,0.02) 1px,
    transparent 2px,
    transparent 4px
  );
  animation: scan 6s linear infinite;
  opacity: 0.3;
}

@keyframes scan {
  0% { transform: translateY(0); }
  100% { transform: translateY(4px); }
}

/* === Toolbar === */
#top-toolbar {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 10px;
  background: rgba(0, 20, 30, 0.8);
  border-bottom: 2px solid #00fff2;
  box-shadow: 0 0 10px #00fff2;
  position: sticky;
  top: 0;
  z-index: 10;
}

/* === Buttons === */
button {
  background: rgba(0, 255, 242, 0.15);
  border: 1px solid #00fff2;
  color: #00fff2;
  padding: 6px 14px;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.9rem;
  letter-spacing: 1px;
  border-radius: 4px;
  text-shadow: 0 0 4px #00fff2;
  transition: all 0.2s ease;
}

button:hover {
  background: rgba(0, 255, 242, 0.3);
  box-shadow: 0 0 8px #00fff2;
  transform: scale(1.05);
}

/* === Grid Layout === */
#unit-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
  padding: 20px;
}

/* === Unit Cards === */
.unit-card {
  background: rgba(10, 25, 35, 0.7);
  border: 1px solid #00fff2;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  box-shadow: 0 0 6px rgba(0,255,242,0.3);
  transition: all 0.2s ease;
}

.unit-card:hover {
  background: rgba(20, 40, 50, 0.9);
  transform: scale(1.02);
  box-shadow: 0 0 12px #00fff2;
}

.unit-card h4 {
  font-family: 'Orbitron', sans-serif;
  color: #00fff2;
  margin-bottom: 4px;
  text-shadow: 0 0 6px #00fff2;
}

.unit-card p {
  color: #aee3ff;
  font-size: 0.9rem;
  margin: 3px 0;
}

/* === Army Section === */
#army-container {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rank-section {
  border: 1px solid #00fff2;
  border-radius: 10px;
  background: rgba(0, 15, 25, 0.8);
  box-shadow: 0 0 10px rgba(0,255,242,0.2);
  padding: 10px;
  animation: fadeIn 0.3s ease;
}

.rank-section h3 {
  font-family: 'Orbitron', sans-serif;
  color: #00fff2;
  text-transform: uppercase;
  border-bottom: 1px solid rgba(0,255,242,0.4);
  margin-bottom: 6px;
  padding-bottom: 4px;
  text-shadow: 0 0 6px #00fff2;
}

.rank-list {
  padding-left: 8px;
}

.army-unit {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 0;
  border-bottom: 1px solid rgba(0,255,242,0.2);
}

.remove-unit {
  background: transparent;
  color: #ff6060;
  border: none;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.remove-unit:hover {
  text-shadow: 0 0 8px #ff6060;
  transform: scale(1.1);
}

/* === Summary Display === */
#army-summary {
  text-align: right;
  font-family: 'Orbitron', sans-serif;
  color: #00fff2;
  border-top: 1px solid rgba(0,255,242,0.4);
  padding: 10px;
  box-shadow: 0 0 8px rgba(0,255,242,0.4);
}

/* === Faction Modal === */
#faction-modal {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 10, 20, 0.9);
  z-index: 200;
  justify-content: center;
  align-items: center;
}

#faction-modal .modal-content {
  background: rgba(5, 15, 25, 0.95);
  border: 2px solid #00fff2;
  box-shadow: 0 0 15px #00fff2;
  border-radius: 10px;
  padding: 20px 30px;
  text-align: center;
}

#faction-modal h2 {
  font-family: 'Orbitron', sans-serif;
  color: #00fff2;
  text-shadow: 0 0 10px #00fff2;
  margin-bottom: 20px;
}

#faction-list button {
  margin: 8px;
  font-size: 1rem;
  padding: 10px 18px;
}

/* === Animations === */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
