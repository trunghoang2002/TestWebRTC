const socket = io('http://localhost:3000');
let localStream = null;
let selectedDeviceId = null; // ID của camera được chọn

// Lấy danh sách thiết bị camera và cập nhật dropdown
async function loadCameraList() {
    const videoDevices = await navigator.mediaDevices.enumerateDevices();
    const cameraSelect = document.getElementById('camera-select');
    cameraSelect.innerHTML = ""; // Xóa danh sách cũ

    const cameras = videoDevices.filter(device => device.kind === 'videoinput');
    if (cameras.length === 0) {
        console.error("Không tìm thấy camera nào!");
        return;
    }

    cameras.forEach((camera, index) => {
        const option = document.createElement('option');
        option.value = camera.deviceId;
        option.text = camera.label || `Camera ${index + 1}`;
        cameraSelect.appendChild(option);
    });

    // Chọn camera đầu tiên mặc định
    selectedDeviceId = cameras[0].deviceId;
}

// Khi người dùng chọn camera, cập nhật selectedDeviceId
document.getElementById('camera-select').addEventListener('change', function () {
    selectedDeviceId = this.value;
});

// Mở camera với deviceId được chọn
async function startCamera() {
    if (!selectedDeviceId) {
        console.error("Chưa chọn camera.");
        return;
    }

    if (localStream) {
        stopCamera(); // Tắt camera trước khi bật camera mới
    }

    localStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: selectedDeviceId } },
        audio: false
    });

    playStream('localStream', localStream);
}

// Tắt camera
function stopCamera() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        document.getElementById('localStream').srcObject = null;
        localStream = null;
    }
}

// Phát stream lên video tag
function playStream(idVideoTag, stream) {
    const video = document.getElementById(idVideoTag);
    video.srcObject = stream;
    video.play();
}

// Load danh sách camera khi trang tải
loadCameraList();

// Sự kiện bấm nút bật/tắt camera
document.getElementById('start-camera').addEventListener('click', startCamera);
document.getElementById('stop-camera').addEventListener('click', stopCamera);

// Khởi tạo PeerJS
var peer = new Peer();
peer.on('open', id => $('#my-peer').append(id));

// Caller
$('#connect').click(() => {
    const Id = $('#remote-peer').val();
    if (!localStream) {
        alert("Vui lòng bật camera trước khi gọi!");
        return;
    }
    const call = peer.call(Id, localStream);
    call.on('stream', remoteStream => playStream('remoteStream', remoteStream));
});

// Callee
peer.on('call', call => {
    if (!localStream) {
        startCamera().then(() => {
            call.answer(localStream);
            playStream('localStream', localStream);
            call.on('stream', remoteStream => playStream('remoteStream', remoteStream));
        });
    } else {
        call.answer(localStream);
        playStream('localStream', localStream);
        call.on('stream', remoteStream => playStream('remoteStream', remoteStream));
    }
});