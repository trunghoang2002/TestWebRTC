const socket = io('http://localhost:3000');
let localStream = null;
let selectedDeviceId = null; // ID của camera được chọn

// Lấy danh sách thiết bị camera và cập nhật dropdown
async function loadCameraList() {
    console.log("Đang lấy danh sách camera...");
    const videoDevices = await navigator.mediaDevices.enumerateDevices();
    console.log("Danh sách thiết bị:", videoDevices);

    const cameras = videoDevices.filter(device => device.kind === 'videoinput');
    console.log("Danh sách camera:", cameras);

    const cameraSelect = document.getElementById('camera-select');
    cameraSelect.innerHTML = ""; // Xóa danh sách cũ

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
    console.log("Camera mặc định được chọn:", selectedDeviceId);
    return selectedDeviceId;
}

// Khi người dùng chọn camera, cập nhật selectedDeviceId
document.getElementById('camera-select').addEventListener('change', function () {
    selectedDeviceId = this.value;
});

async function openStream(deviceId) {
    const config = {
        audio: false,
        video: { deviceId: deviceId ? { exact: deviceId } : undefined }
    };
    return navigator.mediaDevices.getUserMedia(config);
}

// Phát stream lên video tag
function playStream(idVideoTag, stream) {
    const video = document.getElementById(idVideoTag);
    video.srcObject = stream;
    video.play();
}

// Mở camera với deviceId được chọn
async function startCamera() {
    if (selectedDeviceId === null) {
        console.error("Chưa chọn camera.");
        selectedDeviceId = await loadCameraList(); // Thử tải lại danh sách camera
        console.log("selectedDeviceId: ", selectedDeviceId)
        if (!selectedDeviceId) return; // Nếu vẫn không có thì dừng
    }

    if (localStream) {
        stopCamera(); // Tắt camera trước khi bật camera mới
    }

    localStream = await openStream(selectedDeviceId);

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

// Load danh sách camera khi trang tải
loadCameraList().then(deviceId => {
    if (deviceId) {
        selectedDeviceId = deviceId; // Đảm bảo selectedDeviceId có giá trị hợp lệ
    }
});


// Sự kiện bấm nút bật/tắt camera
document.getElementById('start-camera').addEventListener('click', startCamera);
document.getElementById('stop-camera').addEventListener('click', stopCamera);

// Khởi tạo PeerJS
var peer = new Peer();
peer.on('open', id => {
    $('#my-peer').append(id)
    // Đăng kí user
    $('#signup').click(() => {
        const username = $('#txtUsername').val();
        socket.emit('signup', { username: username, peerId: id });
    });
});

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

// Nhận thông báo từ server
socket.on('signup-success', () => {
    alert("Đăng kí thành công!");
});

socket.on('signup-failed', () => {
    alert("Tên người dùng đã tồn tại!");
});

socket.on('new-user', user => {
    
});

socket.on('all-user', user => {
    $('#listUser').empty();
    user.forEach(u => {
        $('#listUser').append(`<li>${u.username} - ${u.peerId}</li>`);
    });
});