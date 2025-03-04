const socket = io('http://localhost:3000');
let localStream = null;

// Hàm lấy danh sách thiết bị camera
async function getVideoDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'videoinput');
}

// Hàm mở camera
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

// Bật camera
async function startCamera() {
    const videoDevices = await getVideoDevices();
    if (videoDevices.length > 0) {
        const selectedDeviceId = videoDevices[0].deviceId;
        localStream = await openStream(selectedDeviceId);
        playStream('localStream', localStream);
    } else {
        console.error('Không tìm thấy camera nào.');
    }
}

// Tắt camera
function stopCamera() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        document.getElementById('localStream').srcObject = null;
    }
}

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