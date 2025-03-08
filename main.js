const socket = io('http://localhost:3000');
let localStream = null;
let selectedDeviceId = null; // ID của camera được chọn
let currentCall = null;

$('#notification-bar').hide();
$('#main').hide();

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

    try {
        localStream = await openStream(selectedDeviceId);
        playStream('localStream', localStream);
    } catch (error) {
        console.error("Lỗi mở camera:", error);
        alert("Không thể mở camera. Vui lòng kiểm tra quyền truy cập.");
    }
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

    socket.emit("check-user-status", { peerId: Id }, (response) => {
        if (response.status === "busy") {
            alert("Người nhận đang bận. Hãy thử lại sau!");
        } else {
            socket.emit("update-status", { peerId: peer.id, status: "busy" });
            startCall(Id);
        }
    });
});

// Gọi cho user khác đang online
$('#listUser').on('click', '.user-item', function () {
    const Id = $(this).attr('id');
    const username = $(this).text();

    if (Id === peer.id) {
        alert("Không thể gọi cho chính mình!");
        return;
    }

    if (!localStream) {
        alert("Vui lòng bật camera trước khi gọi!");
        return;
    }

    if (currentCall) {
        alert("Bạn đang trong cuộc gọi. Hãy kết thúc trước khi gọi tiếp.");
        return;
    }

    socket.emit("update-status", { peerId: peer.id, status: "busy" });
    startCall(Id, username);
});

// Callee
peer.on('call', call => {
    if (!localStream) {
        startCamera().then(() => {
            handleIncomingCall(call);
        });
    } else {
        handleIncomingCall(call);
    }
});

function handleIncomingCall(call) {
    const fromPeerId = call.peer;

    if (currentCall) {
        // Nếu đã có cuộc gọi, hỏi người dùng có muốn chuyển cuộc gọi không
        console.log("incomming call")
        const acceptSwitch = confirm(`📞 ${fromPeerId} đang gọi cho bạn. Bạn có muốn chuyển cuộc gọi không?`);

        if (acceptSwitch) {
            socket.emit("switch-call", { fromPeerId: peer.id, oldPeerId: currentCall.peer, newPeerId: fromPeerId });
            currentCall.close(); // Kết thúc cuộc gọi cũ
            socket.emit("update-status", { peerId: peer.id, status: "busy" });
            acceptCall(call);
        } else {
            socket.emit("end-call", { peerId: peer.id }); // Giữ nguyên cuộc gọi hiện tại
        }
    } else {
        // Nếu không có cuộc gọi nào, nhận cuộc gọi bình thường
        socket.emit("update-status", { peerId: peer.id, status: "busy" });
        acceptCall(call);
    }
}

function acceptCall(call) {
    call.answer(localStream);
    currentCall = call;

    username = getUsernamebypeerId(call.peer);
    $('#call-status').text(`📞 Đang nhận cuộc gọi từ ${username}`).show();

    call.on('stream', remoteStream => {
        playStream('remoteStream', remoteStream);
        $('#end-call').show();
    });

    call.on('close', () => {
        endCall();
    });
}


function startCall(Id) {
    const call = peer.call(Id, localStream);
    currentCall = call;

    username = getUsernamebypeerId(Id);
    $('#call-status').text(`📞 Đang gọi ${username}...`).show();

    call.on('stream', remoteStream => {
        playStream('remoteStream', remoteStream);
        $('#end-call').show();
    });

    call.on('close', () => {
        endCall();
    });
}

// Sự kiện kết thúc cuộc gọi
$('#end-call').click(() => {
    endCall();
});

function endCall() {
    if (currentCall) {
        currentCall.close(); // Đóng cuộc gọi
        currentCall = null;  // Reset biến cuộc gọi
        socket.emit("end-call", { peerId: peer.id }); // Cập nhật trạng thái server
    }

    // Ẩn remote video, nút kết thúc cuộc gọi và thông báo trạng thái cuộc gọi
    const remoteVideo = $('#remoteStream').get(0);
    if (remoteVideo) {
        remoteVideo.srcObject = null;
    }
    $('#end-call').hide();
    $('#call-status').hide();
}

// Sự kiện logout
$('#logout').click(() => {
    socket.emit('logout');
    // socket.disconnect();
    peer.destroy();
    stopCamera();
    $('#main').hide();
    $('#register').show();
});

// Nhận thông báo từ server
socket.on('signup-success', username => {
    alert("Đăng kí thành công!");
    $('#register').hide();
    $('#main').show();
    $('#my-username').append(username);
    $('#txtUsername').val(''); // Reset lại input

    socket.on('new-user', username => {
        showNotification(`User mới đăng ký: ${username}`);
        showTitleNotification(`🔔 User mới: ${username}`);
    });
});

socket.on('signup-failed', () => {
    alert("Tên người dùng đã tồn tại!");
});


socket.on('all-user', (data) => {
    $('#listUser').empty(); // Xóa danh sách cũ
    userInfos = data.users;
    userStatus = data.status;
    userInfos.forEach(u => {
        const isBusy = userStatus[u.peerId] === "busy";
        console.log(u.username, ": ", isBusy);
        $('#listUser').append(`<button class="user-item ${isBusy ? 'busy' : 'idle'}" id="${u.peerId}">${u.username}</button>`);
    });
});

socket.on('user-disconnected', user => {
    showNotification(`User ${user.username} đã thoát.`);
    showTitleNotification(`User ${user.username} đã thoát.`);
    $(`#${user.peerId}`).remove();
});

socket.on('update-user-status', (data) => {
    id = data.peerId;
    stat = data.status;
    $('#listUser').find(`#${id}`).removeClass('busy idle').addClass(stat);
});

socket.on("incoming-call", ({ fromPeerId }) => {
    const acceptCall = confirm(`${fromPeerId} đang gọi cho bạn. Bạn có muốn nhận cuộc gọi không?`);
    
    if (acceptCall) {
        if (currentCall) {
            // Nếu đang trong cuộc gọi, kết thúc cuộc gọi cũ trước
            socket.emit("switch-call", { fromPeerId: peer.id, oldPeerId: currentCall.peer, newPeerId: fromPeerId });
            currentCall.close(); // Kết thúc cuộc gọi với user B
        }
        
        // Bắt đầu cuộc gọi với user C
        startCall(fromPeerId);
    } else {
        socket.emit("end-call", { peerId: peer.id }); // Không nhận, user vẫn rảnh
    }
});

function showNotification(text) {
    const bar = document.getElementById('notification-bar');
    bar.textContent = text;
    bar.style.display = "block";

    setTimeout(() => {
        bar.style.display = "none";
    }, 3000); // Ẩn sau 3 giây
}

function showTitleNotification(text) {
    document.title = text;
    
    setTimeout(() => {
        document.title = "Trang của bạn";  // Reset lại tiêu đề
    }, 5000);
}

function getUsernamebypeerId(id) {
    return $(`#${id}`).text();
}