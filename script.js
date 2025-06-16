// Audio System
class AudioSystem {
    constructor() {
        this.audioContext = null;
        this.isEnabled = true;
        this.initAudio();
    }
    
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Audio not supported');
            this.isEnabled = false;
        }
    }
    
    resumeContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
    
    playTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!this.audioContext || !this.isEnabled) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration / 1000);
    }
    
    playSuccess() {
        // Happy chord progression
        this.playTone(523, 150, 'sine', 0.4); // C5
        setTimeout(() => this.playTone(659, 150, 'sine', 0.4), 100); // E5
        setTimeout(() => this.playTone(784, 300, 'sine', 0.4), 200); // G5
    }
    
    playError() {
        // Buzzer sound
        this.playTone(220, 500, 'sawtooth', 0.3);
    }
    
    playClick() {
        // Button click
        this.playTone(800, 100, 'square', 0.2);
    }
    
    playLevelStart() {
        // Level start jingle
        this.playTone(440, 200, 'sine', 0.3);
        setTimeout(() => this.playTone(523, 200, 'sine', 0.3), 150);
    }
    
    playGameOver() {
        // Descending sad tones
        this.playTone(440, 300, 'sine', 0.4);
        setTimeout(() => this.playTone(392, 300, 'sine', 0.4), 200);
        setTimeout(() => this.playTone(349, 500, 'sine', 0.4), 400);
    }
    
    playVictory() {
        // Victory fanfare
        this.playTone(523, 200, 'sine', 0.4); // C
        setTimeout(() => this.playTone(659, 200, 'sine', 0.4), 150); // E
        setTimeout(() => this.playTone(784, 200, 'sine', 0.4), 300); // G
        setTimeout(() => this.playTone(1047, 400, 'sine', 0.4), 450); // C
    }
    
    playTick() {
        // Timer tick for last 5 seconds
        this.playTone(1000, 50, 'square', 0.15);
    }
}

// Record Rush Game
class RecordRushGame {
    constructor() {
        this.currentLevel = 1;
        this.score = 0;
        this.timeLeft = 30;
        this.gameTimer = null;
        this.isPaused = false;
        this.isGameRunning = false;
        this.maxLevels = 50;
        this.draggedElement = null;
        this.gameObjects = [];
        
        this.audio = new AudioSystem();
        this.levelConfigs = this.generateLevelConfigs();
        this.initElements();
        this.bindEvents();
        this.showScreen('start');
    }
    
    generateLevelConfigs() {
        const configs = [];
        for (let i = 1; i <= this.maxLevels; i++) {
            const isBonus = i % 10 === 0;
            configs.push({
                level: i,
                // Fixed 10 second time limit for all levels
                timeLimit: 10,
                recordCount: Math.min(5 + Math.floor(i / 2), 25),
                crateCount: Math.min(2 + Math.floor(i / 1.5), 20),
                movingCrates: Math.min(1 + Math.floor(i / 3), 8),
                // Way more decoy records
                decoyRecords: Math.min(3 + Math.floor(i / 2), 15),
                // Additional difficulty modifiers
                recordSize: Math.max(30, 60 - i), // Records get smaller
                movementSpeed: Math.min(1 + i * 0.1, 5), // Faster movement
                distractionLevel: Math.floor(i / 5), // Screen effects
                fakeTurntables: 0, // No fake turntables
                invisibleRecords: i > 20 ? Math.floor((i - 20) / 5) : 0, // Some records fade in/out
                rotatingObstacles: Math.floor(i / 6), // Spinning obstacles
                isBonus: isBonus,
                bonusMultiplier: isBonus ? 3 : 1 // Higher bonus multiplier
            });
        }
        return configs;
    }
    
    initElements() {
        this.elements = {
            startScreen: document.getElementById('start-screen'),
            gameScreen: document.getElementById('game-screen'),
            gameOverScreen: document.getElementById('game-over-screen'),
            pauseScreen: document.getElementById('pause-screen'),
            levelComplete: document.getElementById('level-complete'),
            gameArea: document.getElementById('game-area'),
            gameObjects: document.getElementById('game-objects'),
            particles: document.getElementById('particles'),
            turntable: document.getElementById('turntable'),
            levelDisplay: document.getElementById('level-display'),
            scoreDisplay: document.getElementById('score-display'),
            timeDisplay: document.getElementById('time-display')
        };
    }
    
    bindEvents() {
        // Enable audio on first user interaction
        document.addEventListener('click', () => {
            this.audio.resumeContext();
        }, { once: true });
        
        document.getElementById('start-button').addEventListener('click', () => {
            this.audio.playClick();
            this.startGame();
        });
        document.getElementById('pause-button').addEventListener('click', () => {
            this.audio.playClick();
            this.pauseGame();
        });
        document.getElementById('resume-button').addEventListener('click', () => {
            this.audio.playClick();
            this.resumeGame();
        });
        document.getElementById('next-level-button').addEventListener('click', () => {
            this.audio.playClick();
            this.nextLevel();
        });
        document.getElementById('restart-button').addEventListener('click', () => {
            this.audio.playClick();
            this.restartGame();
        });
        document.getElementById('menu-button').addEventListener('click', () => {
            this.audio.playClick();
            this.goToMenu();
        });
        document.getElementById('pause-menu-button').addEventListener('click', () => {
            this.audio.playClick();
            this.goToMenu();
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isGameRunning) {
                this.audio.playClick();
                this.isPaused ? this.resumeGame() : this.pauseGame();
            }
        });
        
        this.setupDropZone();
    }
    
    setupDropZone() {
        const turntable = this.elements.turntable;
        
        turntable.addEventListener('dragover', (e) => {
            e.preventDefault();
            turntable.classList.add('active');
        });
        
        turntable.addEventListener('dragleave', (e) => {
            if (!turntable.contains(e.relatedTarget)) {
                turntable.classList.remove('active');
            }
        });
        
        turntable.addEventListener('drop', (e) => {
            e.preventDefault();
            turntable.classList.remove('active');
            this.handleRecordDrop();
        });
    }
    
    showScreen(screenName) {
        // Force hide all screens first
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
            screen.style.display = 'none';
        });
        
        // Small delay to ensure hiding takes effect
        setTimeout(() => {
            switch(screenName) {
                case 'start':
                    this.elements.startScreen.classList.remove('hidden');
                    this.elements.startScreen.style.display = 'flex';
                    break;
                case 'game':
                    this.elements.gameScreen.classList.remove('hidden');
                    this.elements.gameScreen.style.display = 'flex';
                    break;
                case 'gameover':
                    this.elements.gameOverScreen.classList.remove('hidden');
                    this.elements.gameOverScreen.style.display = 'flex';
                    break;
                case 'pause':
                    this.elements.pauseScreen.classList.remove('hidden');
                    this.elements.pauseScreen.style.display = 'flex';
                    break;
            }
        }, 10);
    }
    
    startGame() {
        this.currentLevel = 1;
        this.score = 0;
        this.isGameRunning = true;
        this.showScreen('game');
        this.startLevel();
    }
    
    startLevel() {
        const config = this.levelConfigs[this.currentLevel - 1];
        this.timeLeft = config.timeLimit;
        
        this.elements.levelDisplay.textContent = this.currentLevel;
        this.elements.scoreDisplay.textContent = this.score;
        this.elements.timeDisplay.textContent = this.timeLeft;
        
        if (config.isBonus) {
            this.showBonusIndicator();
        }
        
        this.clearGameArea();
        this.generateLevel(config);
        this.startTimer();
        
        // Play level start sound
        setTimeout(() => {
            this.audio.playLevelStart();
        }, 300);
    }
    
    showBonusIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'bonus-level';
        indicator.textContent = '🎁 BONUS LEVEL! 🎁';
        this.elements.gameArea.appendChild(indicator);
        
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 3000);
    }
    
    generateLevel(config) {
        const areaWidth = window.innerWidth - 350;
        const areaHeight = window.innerHeight - 120;
        
        // Add screen distraction effects for higher levels
        if (config.distractionLevel > 0) {
            this.addScreenDistraction(config.distractionLevel);
        }
        
        for (let i = 0; i < config.crateCount; i++) {
            this.createCrate(areaWidth, areaHeight, i < config.movingCrates);
        }
        
        // Add rotating obstacles for extreme difficulty
        for (let i = 0; i < config.rotatingObstacles; i++) {
            this.createRotatingObstacle(areaWidth, areaHeight);
        }
        
        for (let i = 0; i < config.decoyRecords; i++) {
            this.createRecord(areaWidth, areaHeight, false);
        }
        
        // Create the purple record last, with smart positioning
        this.createRecord(areaWidth, areaHeight, true);
    }
    

    
    createRotatingObstacle(maxWidth, maxHeight) {
        const obstacle = document.createElement('div');
        obstacle.className = 'rotating-obstacle';
        
        const x = Math.random() * (maxWidth - 100);
        const y = Math.random() * (maxHeight - 100) + 100;
        
        obstacle.style.left = x + 'px';
        obstacle.style.top = y + 'px';
        
        this.elements.gameObjects.appendChild(obstacle);
        this.gameObjects.push(obstacle);
    }
    
    addScreenDistraction(level) {
        const gameArea = this.elements.gameArea;
        
        // Add flickering effect
        if (level >= 1) {
            gameArea.classList.add('screen-flicker');
        }
        
        // Add color distortion
        if (level >= 2) {
            gameArea.classList.add('color-distortion');
        }
        
        // Add screen shake periodically
        if (level >= 3) {
            setInterval(() => {
                if (this.isGameRunning && !this.isPaused) {
                    document.body.classList.add('screen-shake');
                    setTimeout(() => {
                        document.body.classList.remove('screen-shake');
                    }, 200);
                }
            }, 3000 + Math.random() * 2000);
        }
    }
    
    createCrate(maxWidth, maxHeight, isMoving = false) {
        const crate = document.createElement('div');
        crate.className = isMoving ? 'crate moving-crate' : 'crate';
        
        crate.style.left = Math.random() * (maxWidth - 80) + 'px';
        crate.style.top = Math.random() * (maxHeight - 80) + 100 + 'px';
        
        this.elements.gameObjects.appendChild(crate);
        this.gameObjects.push(crate);
    }
    
    createRecord(maxWidth, maxHeight, isPurple = false) {
        const config = this.levelConfigs[this.currentLevel - 1];
        const record = document.createElement('div');
        record.className = 'record';
        record.draggable = true;
        
        // Apply dynamic record size based on level
        const recordSize = config.recordSize;
        record.style.width = recordSize + 'px';
        record.style.height = recordSize + 'px';
        
        if (isPurple) {
            record.classList.add('purple');
            record.dataset.isPurple = 'true';
            
            // Make purple record even harder to spot on higher levels
            if (this.currentLevel > 15) {
                record.style.opacity = '0.85';
            }
        } else {
            const colors = ['black', 'red', 'blue', 'green', 'orange', 'yellow'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            record.classList.add(randomColor);
            
            // Add similar-looking decoy records
            if (this.currentLevel > 10 && Math.random() < 0.3) {
                record.classList.add('dark-purple'); // Very similar to purple
            }
        }
        
        let x, y;
        let attempts = 0;
        do {
            if (isPurple) {
                // Purple vinyl always spawns on the left side of the screen
                x = Math.random() * (maxWidth * 0.3); // Left 30% of screen
            } else {
                // Decoy records can spawn anywhere except the turntable area
                x = Math.random() * (maxWidth - recordSize);
            }
            y = Math.random() * (maxHeight - recordSize) + 100;
            attempts++;
        } while (attempts < 50 && this.isPositionBlocked(x, y, recordSize, isPurple));
        
        record.style.left = x + 'px';
        record.style.top = y + 'px';
        
        // Add movement for higher levels (but not for purple record)
        if (config.movementSpeed > 1 && !isPurple) {
            this.addRecordMovement(record, config.movementSpeed);
        }
        
        // Add invisibility effect for very high levels
        if (config.invisibleRecords > 0 && !isPurple && Math.random() < 0.3) {
            this.addInvisibilityEffect(record);
        }
        
        this.setupRecordDragEvents(record);
        
        this.elements.gameObjects.appendChild(record);
        this.gameObjects.push(record);
    }
    
    addRecordMovement(record, speed) {
        const moveDistance = 150;
        const duration = Math.max(2000, 5000 - (speed * 500));
        
        const animate = () => {
            if (!record.parentNode) return;
            
            const currentX = parseInt(record.style.left);
            const currentY = parseInt(record.style.top);
            const newX = Math.max(0, Math.min(window.innerWidth - 400, currentX + (Math.random() - 0.5) * moveDistance));
            const newY = Math.max(100, Math.min(window.innerHeight - 200, currentY + (Math.random() - 0.5) * moveDistance));
            
            record.style.transition = `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
            record.style.left = newX + 'px';
            record.style.top = newY + 'px';
            
            setTimeout(() => {
                record.style.transition = '';
                animate();
            }, duration);
        };
        
        setTimeout(animate, Math.random() * 2000);
    }
    
    addInvisibilityEffect(record) {
        const fadeIn = () => {
            record.style.opacity = '1';
            setTimeout(fadeOut, 2000 + Math.random() * 3000);
        };
        
        const fadeOut = () => {
            record.style.opacity = '0.2';
            setTimeout(fadeIn, 1000 + Math.random() * 2000);
        };
        
        setTimeout(fadeOut, Math.random() * 3000);
    }
    
    isPositionBlocked(x, y, size = 60, isPurple = false) {
        const safeDistance = isPurple ? 120 : 70; // Purple records need more space
        
        for (const obj of this.gameObjects) {
            const objRect = obj.getBoundingClientRect();
            const gameAreaRect = this.elements.gameArea.getBoundingClientRect();
            const objX = objRect.left - gameAreaRect.left;
            const objY = objRect.top - gameAreaRect.top;
            
            // Extra safety for purple records around moving objects
            if (isPurple && obj.classList.contains('moving-crate')) {
                if (Math.abs(x - objX) < 150 && Math.abs(y - objY) < 150) {
                    return true;
                }
            } else if (Math.abs(x - objX) < safeDistance && Math.abs(y - objY) < safeDistance) {
                return true;
            }
        }
        return false;
    }
    
    checkCollisionDuringDrag(record, x, y) {
        const recordSize = parseInt(record.style.width) || 60;
        const recordRect = {
            left: x,
            top: y,
            right: x + recordSize,
            bottom: y + recordSize
        };
        
        for (const obj of this.gameObjects) {
            if (obj === record) continue;
            
            const objRect = obj.getBoundingClientRect();
            const gameAreaRect = this.elements.gameArea.getBoundingClientRect();
            const objX = objRect.left - gameAreaRect.left;
            const objY = objRect.top - gameAreaRect.top;
            const objWidth = objRect.width;
            const objHeight = objRect.height;
            
            const objRectNormalized = {
                left: objX,
                top: objY,
                right: objX + objWidth,
                bottom: objY + objHeight
            };
            
            // Check if rectangles overlap
            if (recordRect.left < objRectNormalized.right &&
                recordRect.right > objRectNormalized.left &&
                recordRect.top < objRectNormalized.bottom &&
                recordRect.bottom > objRectNormalized.top) {
                return true; // Collision detected
            }
        }
        return false;
    }
    
    setupRecordDragEvents(record) {
        let isDragging = false;
        
        record.addEventListener('dragstart', (e) => {
            this.draggedElement = record;
            record.classList.add('dragging');
            isDragging = true;
        });
        
        record.addEventListener('drag', (e) => {
            if (!isDragging || !this.draggedElement) return;
            
            // Get current position during drag
            const gameAreaRect = this.elements.gameArea.getBoundingClientRect();
            const x = e.clientX - gameAreaRect.left - 30; // Center the record
            const y = e.clientY - gameAreaRect.top - 30;
            
            // Check for collision during drag
            if (this.checkCollisionDuringDrag(record, x, y)) {
                this.handleCollisionDuringDrag();
                return;
            }
        });
        
        record.addEventListener('dragend', () => {
            record.classList.remove('dragging');
            isDragging = false;
            this.draggedElement = null;
        });
        
        // Touch events for mobile support
        record.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.draggedElement = record;
            record.classList.add('dragging');
            isDragging = true;
        });
        
        record.addEventListener('touchmove', (e) => {
            if (!isDragging || !this.draggedElement) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            const gameAreaRect = this.elements.gameArea.getBoundingClientRect();
            const x = touch.clientX - gameAreaRect.left - 30;
            const y = touch.clientY - gameAreaRect.top - 30;
            
            // Update position
            record.style.left = x + 'px';
            record.style.top = y + 'px';
            
            // Check for collision during drag
            if (this.checkCollisionDuringDrag(record, x, y)) {
                this.handleCollisionDuringDrag();
                return;
            }
        });
        
        record.addEventListener('touchend', (e) => {
            e.preventDefault();
            record.classList.remove('dragging');
            isDragging = false;
            
            if (!this.draggedElement) return;
            
            const touch = e.changedTouches[0];
            const turntableRect = this.elements.turntable.getBoundingClientRect();
            
            // Check if touch ended over turntable
            if (touch.clientX >= turntableRect.left && 
                touch.clientX <= turntableRect.right &&
                touch.clientY >= turntableRect.top && 
                touch.clientY <= turntableRect.bottom) {
                this.handleRecordDrop();
            }
            
            this.draggedElement = null;
        });
    }
    
    handleCollisionDuringDrag() {
        // Game over when hitting objects during drag
        this.audio.playError();
        
        // Screen shake effect
        document.body.classList.add('screen-shake');
        setTimeout(() => {
            document.body.classList.remove('screen-shake');
        }, 500);
        
        // End the game immediately
        this.gameOver();
    }
    
    handleRecordDrop() {
        if (!this.draggedElement) return;
        
        const record = this.draggedElement;
        const isPurple = record.dataset.isPurple === 'true';
        
        if (isPurple) {
            this.handleCorrectRecord();
        } else {
            this.handleWrongRecord();
        }
        
        record.remove();
        const index = this.gameObjects.indexOf(record);
        if (index > -1) {
            this.gameObjects.splice(index, 1);
        }
    }
    
    handleCorrectRecord() {
        const config = this.levelConfigs[this.currentLevel - 1];
        const timeBonus = this.timeLeft * 10;
        const levelScore = (100 + timeBonus) * config.bonusMultiplier;
        
        this.score += levelScore;
        this.elements.scoreDisplay.textContent = this.score;
        
        // Play success sound
        this.audio.playSuccess();
        
        this.createSuccessParticles();
        
        const platter = this.elements.turntable.querySelector('.turntable-platter');
        platter.classList.add('spinning');
        
        clearInterval(this.gameTimer);
        
        setTimeout(() => {
            this.showLevelComplete(levelScore, timeBonus);
        }, 1000);
    }
    
    handleWrongRecord() {
        this.timeLeft = Math.max(0, this.timeLeft - 5);
        this.elements.timeDisplay.textContent = this.timeLeft;
        
        // Play error sound
        this.audio.playError();
        
        document.body.classList.add('screen-shake');
        setTimeout(() => {
            document.body.classList.remove('screen-shake');
        }, 500);
        
        if (this.timeLeft <= 0) {
            this.gameOver();
        }
    }
    
    createSuccessParticles() {
        const turntableRect = this.elements.turntable.getBoundingClientRect();
        const gameAreaRect = this.elements.gameArea.getBoundingClientRect();
        
        for (let i = 0; i < 10; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle success';
            
            const x = turntableRect.left - gameAreaRect.left + turntableRect.width / 2;
            const y = turntableRect.top - gameAreaRect.top + turntableRect.height / 2;
            
            particle.style.left = (x + (Math.random() - 0.5) * 100) + 'px';
            particle.style.top = (y + (Math.random() - 0.5) * 100) + 'px';
            
            this.elements.particles.appendChild(particle);
            
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 1000);
        }
    }
    
    showLevelComplete(levelScore, timeBonus) {
        document.querySelector('#level-score span').textContent = levelScore;
        document.querySelector('#level-time span').textContent = timeBonus;
        this.elements.levelComplete.classList.remove('hidden');
    }
    
    nextLevel() {
        this.elements.levelComplete.classList.add('hidden');
        
        if (this.currentLevel >= this.maxLevels) {
            this.gameWin();
            return;
        }
        
        this.currentLevel++;
        
        const platter = this.elements.turntable.querySelector('.turntable-platter');
        platter.classList.remove('spinning');
        
        this.startLevel();
    }
    
    startTimer() {
        this.gameTimer = setInterval(() => {
            if (!this.isPaused) {
                this.timeLeft--;
                this.elements.timeDisplay.textContent = this.timeLeft;
                
                // Add warning styling for low time
                if (this.timeLeft <= 10) {
                    this.elements.timeDisplay.classList.add('warning');
                } else {
                    this.elements.timeDisplay.classList.remove('warning');
                }
                
                // Play tick sound for last 5 seconds
                if (this.timeLeft <= 5 && this.timeLeft > 0) {
                    this.audio.playTick();
                }
                
                if (this.timeLeft <= 0) {
                    this.gameOver();
                }
            }
        }, 1000);
    }
    
    pauseGame() {
        this.isPaused = true;
        this.showScreen('pause');
    }
    
    resumeGame() {
        this.isPaused = false;
        this.showScreen('game');
    }
    
    gameOver() {
        this.isGameRunning = false;
        clearInterval(this.gameTimer);
        
        // Play game over sound
        this.audio.playGameOver();
        
        document.querySelector('#final-score span').textContent = this.score;
        document.querySelector('#levels-completed span').textContent = this.currentLevel - 1;
        
        this.showScreen('gameover');
    }
    
    gameWin() {
        this.isGameRunning = false;
        clearInterval(this.gameTimer);
        
        // Play victory sound
        this.audio.playVictory();
        
        document.querySelector('#game-over-screen h2').textContent = '🏆 You Win! 🏆';
        document.querySelector('#final-score span').textContent = this.score;
        document.querySelector('#levels-completed span').textContent = this.maxLevels;
        
        this.showScreen('gameover');
    }
    
    restartGame() {
        this.clearGameArea();
        document.querySelector('#game-over-screen h2').textContent = '🎮 Game Over';
        this.startGame();
    }
    
    goToMenu() {
        this.clearGameArea();
        this.isGameRunning = false;
        this.isPaused = false;
        clearInterval(this.gameTimer);
        
        const platter = this.elements.turntable.querySelector('.turntable-platter');
        platter.classList.remove('spinning');
        
        this.showScreen('start');
    }
    
    clearGameArea() {
        this.elements.gameObjects.innerHTML = '';
        this.elements.particles.innerHTML = '';
        this.gameObjects = [];
        
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
        
        this.elements.levelComplete.classList.add('hidden');
        this.elements.turntable.classList.remove('active');
    }
}

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
    new RecordRushGame();
}); 