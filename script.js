// 1. Firebase 설정 (캡틴의 설정)
const firebaseConfig = {
    apiKey: "AIzaSyA_JNWO5Ke5ZVJDnwP06QW9WsZXNZFv0bc",
    authDomain: "sundochem-dashboard.firebaseapp.com",
    databaseURL: "https://sundochem-dashboard-default-rtdb.firebaseio.com",
    projectId: "sundochem-dashboard",
    storageBucket: "sundochem-dashboard.firebasestorage.app",
    messagingSenderId: "360796635566",
    appId: "1:360796635566:web:d3bf85eb5e5e1574b5483f"
};
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.database();
const AUTHORIZED_UID = "m79iNvoxRZaolWSyRltHpn2PaEN2"; // 캡틴의 보안 키

document.addEventListener('DOMContentLoaded', () => {
    const mainBody = document.getElementById('main-body');
    const userInfoEl = document.getElementById('user-info'); // 🍒 체리가 빼먹었던 변수 추가!
    const dateInput = document.getElementById('log-date');
    const dayDisplay = document.getElementById('log-day');
    const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];

    let currentRef = null;

    // [보안 체크] 로그인 상태 확인
    auth.onAuthStateChanged((user) => {
        if (user && user.uid === AUTHORIZED_UID) {
            console.log("Welcome Captain!");
            if (userInfoEl) userInfoEl.textContent = `관리자: ${user.email.split('@')[0]}`;
            if (mainBody) mainBody.style.opacity = "1"; // 화면 표시
            initApp();
        } else {
            console.warn("Unauthorized Access!");
            location.replace("login.html"); // 비인증 사용자 차단
        }
    });

    function initApp() {
        const today = new Date();
        dateInput.value = today.toISOString().split('T')[0];
        updateDay();
        
        buildTables(); // 테이블 생성
        loadData(dateInput.value); // 데이터 로드

        dateInput.addEventListener('change', () => {
            updateDay();
            loadData(dateInput.value);
        });

        setupAutoSave(); // 자동 저장 시작
    }

    function updateDay() {
        const selDate = new Date(dateInput.value);
        dayDisplay.textContent = daysOfWeek[selDate.getDay()] + '요일';
    }

    // [자동 저장] 입력 즉시 Firebase 업데이트
    function setupAutoSave() {
        document.addEventListener('input', (e) => {
            if(e.target.classList.contains('sync-item')) {
                const dateStr = dateInput.value;
                const fieldId = e.target.id;
                let value = e.target.value;

                // 숫자 컴마 포맷팅
                if(e.target.classList.contains('qty-calc') || e.target.classList.contains('di-calc')) {
                    value = value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                    e.target.value = value;
                }

                // 즉시 덮어쓰기 저장
                db.ref(`shipping_logs/${dateStr}/${fieldId}`).set(value);
                calculateTotals();
            }
        });
    }

    // Firebase 데이터 로드
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
        
        if(indBody) {
            indBody.innerHTML = '';
            for(let i=1; i<=18; i++) indBody.appendChild(createRow('ind', i));
        }
        
        if(medBody) {
            medBody.innerHTML = '';
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
        }

        if(diL && diR) {
            diL.innerHTML = ''; diR.innerHTML = '';
            for(let i=1; i<=15; i++) {
                diL.appendChild(createDiRow('diL', i));
                diR.appendChild(createDiRow('diR', i+15));
            }
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

// 🍒 전역 함수 (이게 없어서 로그아웃이 안 됐던 거예요!)
function logout() {
    firebase.auth().signOut().then(() => {
        location.replace("login.html");
    });
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
}