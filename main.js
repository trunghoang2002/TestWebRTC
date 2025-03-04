// Hàm lấy danh sách các thiết bị media (camera)
async function getVideoDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'videoinput');
}
// Hàm mở stream với camera cụ thể bằng deviceId
function openStream(deviceId) {
    const config = { 
        audio: false, 
        video: { deviceId: deviceId ? { exact: deviceId } : undefined } 
    };
    return navigator.mediaDevices.getUserMedia(config);
}

// Hàm phát stream lên video tag
function playStream(idVideoTag, stream) {
    const video = document.getElementById(idVideoTag);
    video.srcObject = stream;
    video.play();
}

// Hàm chính để chọn và phát stream từ camera được chọn
async function init() {
    const videoDevices = await getVideoDevices();
    console.log('Danh sách camera:', videoDevices);
    
    if (videoDevices.length > 0) {
        // Ví dụ: chọn camera đầu tiên trong danh sách
        const selectedDeviceId = videoDevices[0].deviceId;
        
        // Mở stream với camera được chọn
        openStream(selectedDeviceId).then(stream => playStream('localStream', stream));
    } else {
        console.error('Không tìm thấy camera nào.');
    }
}

// Khởi chạy hàm init
init();

var peer = new Peer();
peer.on('open', id => $('#my-peer').append(id));

// Caller
$('#connect').click(() => {
    const Id = $('#remote-peer').val();
    openStream().then(stream => {
        playStream('localStream', stream);
        const call = peer.call(Id, stream);
        call.on('stream', remoteStream => playStream('remoteStream', remoteStream));
    });
});

// Callee
peer.on('call', call => {
    openStream().then(stream => {
        call.answer(stream);
        playStream('localStream', stream);
        call.on('stream', remoteStream => playStream('remoteStream', remoteStream));
    });
});