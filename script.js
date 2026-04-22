// 1. Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyA_JNWO5Ke5ZVJDnwP06QW9WsZXNZFv0bc",
    authDomain: "sundochem-dashboard.firebaseapp.com",
    databaseURL: "https://sundochem-dashboard-default-rtdb.firebaseio.com",
    projectId: "sundochem-dashboard",
    storageBucket: "sundochem-dashboard.firebasestorage.app",
    messagingSenderId: "360796635566",
    appId: "1:360796635566:web:d3bf85eb5e5e1574b5483f"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.database();
const AUTHORIZED_UID = "m79iNvoxRZaolWSyRltHpn2PaEN2";

document.addEventListener('DOMContentLoaded', () => {
    const mainBody = document.getElementById('main-body');
    const dateInput = document.getElementById('log-date');
    const dayDisplay = document.getElementById('log-day');
    const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];
    let currentRef = null;

    // [보안 체크]
    auth.onAuthStateChanged((user) => {
        if (user && user.uid === AUTHORIZED_UID) {
            if (mainBody) mainBody.style.opacity = "1";
            initApp();
        } else {
            location.replace("login.html");
        }
    });

    function initApp() {
        setCurrentDate(); // 🍒 초기 날짜 설정
        buildTables();
        loadData(dateInput.value);
        
        dateInput.addEventListener('change', () => {
            updateDay();
            loadData(dateInput.value);
        });
        
        setupAutoSave();
        
        // 🍒 자정 및 날짜 변경 감시 엔진 가동
        startDayWatchdog(); 
    }

    // 🍒 현재 시스템 날짜로 세팅하는 함수
    function setCurrentDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const date = String(now.getDate()).padStart(2, '0');
        dateInput.value = `${year}-${month}-${date}`;
        updateDay();
    }

    function updateDay() {
        const selDate = new Date(dateInput.value);
        dayDisplay.textContent = daysOfWeek[selDate.getDay()] + '요일';
    }

    // 🍒 [이중 보안] 날짜 변경 감시 엔진
    function startDayWatchdog() {
        // 1. 자정 정각에 새로고침 예약 (기존 로직)
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
        const msUntilMidnight = tomorrow.getTime() - now.getTime();
        
        setTimeout(() => {
            // 캐시를 무시하고 최신 데이터를 가져오기 위해 타임스탬프 추가
            window.location.href = window.location.pathname + '?t=' + new Date().getTime();
        }, msUntilMidnight);

        // 2. 1분마다 현재 날짜와 입력된 날짜를 대조 (절전 모드 대비)
        setInterval(() => {
            const todayStr = new Date().toISOString().split('T')[0];
            // 만약 현재 날짜가 입력창의 날짜보다 미래라면 (자정이 지났다면)
            if (todayStr > dateInput.value) {
                console.log("새로운 날짜 감지! 앱을 갱신합니다.");
                window.location.href = window.location.pathname + '?t=' + new Date().getTime();
            }
        }, 60000); // 1분마다 체크
    }

    function setupAutoSave() {
        document.addEventListener('input', (e) => {
            if(e.target.classList.contains('sync-item')) {
                const dateStr = dateInput.value;
                const fieldId = e.target.id;
                let value = e.target.value;
                if(e.target.classList.contains('qty-calc') || e.target.classList.contains('di-calc')) {
                    value = value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                    e.target.value = value;
                }
                db.ref(`shipping_logs/${dateStr}/${fieldId}`).set(value);
                calculateTotals();
            }
        });
    }

    function loadData(dateStr) {
        if (currentRef) currentRef.off();
        currentRef = db.ref(`shipping_logs/${dateStr}`);
        currentRef.on('value', snapshot => {
            const data = snapshot.val() || {};
            document.querySelectorAll('.sync-item').forEach(item => {
                if (document.activeElement !== item) {
                    item.value = data[item.id] || '';
                }
            });
            calculateTotals();
        });
    }

    function buildTables() {
        const indBody = document.getElementById('lco2-industrial-body');
        const medBody = document.getElementById('lco2-medical-body');
        const diL = document.getElementById('di-left-body');
        const diR = document.getElementById('di-right-body');
        indBody.innerHTML = ''; medBody.innerHTML = ''; diL.innerHTML = ''; diR.innerHTML = '';
        for(let i=1; i<=18; i++) indBody.appendChild(createRow('ind', i));
        const medNos = [19, 20, 21, 'TITLE', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        medNos.forEach(no => {
            if(no === 'TITLE') {
                const tr = document.createElement('tr');
                tr.className = "bg-amber-900/40 text-amber-300 font-black border-y border-slate-700";
                tr.innerHTML = `<td colspan="5" class="py-1 tracking-widest text-sm">식품/의료용 액체탄산가스</td>`;
                medBody.appendChild(tr);
            } else {
                medBody.appendChild(createRow('med', no));
            }
        });
        for(let i=1; i<=15; i++) {
            diL.appendChild(createDiRow('diL', i));
            diR.appendChild(createDiRow('diR', i+15));
        }
    }

    function createRow(prefix, no) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${no}</td><td><input type="text" id="${prefix}_vNo_${no}" class="att-input sync-item"></td><td><input type="text" id="${prefix}_dest_${no}" class="att-input sync-item"></td><td><input type="text" id="${prefix}_qty_${no}" class="att-input sync-item qty-calc text-right px-3"></td><td><input type="text" id="${prefix}_time_${no}" class="att-input sync-item"></td>`;
        return tr;
    }

    function createDiRow(prefix, no) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${no}</td><td><input type="text" id="${prefix}_vNo_${no}" class="att-input sync-item"></td><td><input type="text" id="${prefix}_spec_${no}" class="att-input sync-item"></td><td><input type="text" id="${prefix}_count_${no}" class="att-input sync-item"></td><td><input type="text" id="${prefix}_qty_${no}" class="att-input sync-item di-calc text-right px-3"></td><td><input type="text" id="${prefix}_time_${no}" class="att-input sync-item"></td>`;
        return tr;
    }

    function calculateTotals() {
        let indSum = 0, medSum = 0, diSum = 0;
        const getNum = s => Number(s.replace(/,/g, "")) || 0;
        document.querySelectorAll('input[id^="ind_qty_"]').forEach(el => indSum += getNum(el.value));
        document.querySelectorAll('input[id^="med_qty_"]').forEach(el => medSum += getNum(el.value));
        document.querySelectorAll('.di-calc').forEach(el => diSum += getNum(el.value));
        if(document.getElementById('sum-ind-day')) document.getElementById('sum-ind-day').textContent = indSum.toLocaleString() + ' kg';
        if(document.getElementById('sum-med-day')) document.getElementById('sum-med-day').textContent = medSum.toLocaleString() + ' kg';
        if(document.getElementById('sum-total-day')) document.getElementById('sum-total-day').textContent = (indSum + medSum).toLocaleString() + ' kg';
        if(document.getElementById('sum-di-day')) document.getElementById('sum-di-day').textContent = diSum.toLocaleString() + ' kg';
    }
});

function toggleFullScreen() {
    if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); }
    else { if (document.exitFullscreen) document.exitFullscreen(); }
}