const socket = io('http://localhost:3000');
let localStream = null;
let selectedDeviceId = null; // ID của camera được chọn
let currentCall = null;
let isUsingFile = false;
let videoFile = null;
let isPaused = false;

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
        stopCameraAndVideo(); // Tắt camera trước khi bật camera mới
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
function stopCameraAndVideo() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        document.getElementById('localStream').srcObject = null;
        localStream = null;
    }
    if (isUsingFile) {
        document.getElementById('localStream').src = "";
        isUsingFile = false;
    }
}

// Load danh sách camera khi trang tải
loadCameraList().then(deviceId => {
    if (deviceId) {
        selectedDeviceId = deviceId; // Đảm bảo selectedDeviceId có giá trị hợp lệ
    }
});


// Bật camera
$('#start-camera').click(() => {
    isUsingFile = false;
    startCamera();
});
// Tắt camera
$('#stop-camera').click(() => {
    stopCameraAndVideo();
});

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

function handleStartCall(Id) {
    if (Id === peer.id) {
        alert("Không thể gọi cho chính mình!");
        return;
    }

    if (currentCall) {
        alert("Bạn đang trong cuộc gọi. Hãy kết thúc trước khi gọi tiếp.");
        return;
    }

    // socket.emit("check-user-status", { peerId: Id }, (response) => {
    //     if (response.status === "busy") {
    //         alert("Người nhận đang bận. Hãy thử lại sau!");
    //     } else {
    //         socket.emit("update-status", { peerId: peer.id, status: "busy" });
    //         if (!localStream) {
    //             startCamera().then(() => {
    //                 startCall(Id);
    //             });    
    //         }
    //         else {
    //             startCall(Id);
    //         }
    //     }
    // });

    socket.emit("update-status", { peerId: peer.id, status: "busy" });
    if (!localStream && !isUsingFile) {
        startCamera().then(() => {
            startCall(Id);
        });    
    }
    else {
        startCall(Id);
    }
}

function startCall(Id) {
    let streamToSend = isUsingFile ? document.getElementById('localStream').captureStream() : localStream;
    const call = peer.call(Id, streamToSend);
    currentCall = call;
    console.log("currentCall: ", currentCall);

    username = getUsernamebypeerId(Id);
    $('#call-status').text(`📞 Đang gọi ${username}...`).show();

    call.on('stream', remoteStream => {
        playStream('remoteStream', remoteStream);
        $('#end-call').show();
    });

    call.on('close', () => {
        console.log("end call with ", username)
        endCall();
    });
}

function handleIncomingCall(call) {
    const fromPeerId = call.peer;
    const username = getUsernamebypeerId(fromPeerId);
    console.log("Incomming call from: ", username);

    if (currentCall) {
        // Nếu đã có cuộc gọi, hỏi người dùng có muốn chuyển cuộc gọi không
        const acceptSwitch = confirm(`📞 ${username} đang gọi cho bạn. Bạn có muốn chuyển cuộc gọi không?`);

        if (acceptSwitch) {
            currentCall.close(); // Kết thúc cuộc gọi cũ
            socket.emit("update-status", { peerId: peer.id, status: "busy" });
            if (!localStream && !isUsingFile) {
                startCamera().then(() => {
                    acceptCall(call);
                });
            } else {
                acceptCall(call);
            }
        } else {
            // Gửi thông báo từ chối qua PeerJS Data Connection
            const conn = peer.connect(fromPeerId);
            conn.on('open', () => {
                conn.send({ type: "call-rejected", message: "Người nhận đang bận và từ chối cuộc gọi." });
            });
        }
    } else {
        const accept = confirm(`📞 ${username} đang gọi cho bạn. Chấp nhận không?`);
        if (accept) {
            socket.emit("update-status", { peerId: peer.id, status: "busy" });
             if (!localStream && !isUsingFile) {
                startCamera().then(() => {
                    acceptCall(call);
                });
            } else {
                acceptCall(call);
            }
        }
        else {
            // Gửi thông báo từ chối qua PeerJS Data Connection
            const conn = peer.connect(fromPeerId);
            conn.on('open', () => {
                conn.send({ type: "call-rejected", message: "Người nhận đang bận và từ chối cuộc gọi." });
            });
        }
    }
}

function acceptCall(call) {
    let streamToSend = isUsingFile ? document.getElementById('localStream').captureStream() : localStream;
    call.answer(streamToSend);
    currentCall = call;

    const username = getUsernamebypeerId(call.peer);
    $('#call-status').text(`📞 Đang nhận cuộc gọi từ ${username}`).show();

    call.on('stream', remoteStream => {
        playStream('remoteStream', remoteStream);
        $('#end-call').show();
    });

    call.on('close', () => {
        console.log("end call with ", username)
        endCall();
    });
}

function endCall() {
    if (currentCall) {
        currentCall.close(); // Đóng cuộc gọi
        currentCall = null;  // Reset biến cuộc gọi
        socket.emit("end-call", { peerId: peer.id }); // Cập nhật trạng thái server
    }

    // Tắt camera
    stopCameraAndVideo();

    // Ẩn remote video, nút kết thúc cuộc gọi và thông báo trạng thái cuộc gọi
    const remoteVideo = $('#remoteStream').get(0);
    if (remoteVideo) {
        remoteVideo.srcObject = null;
    }
    $('#end-call').hide();
    $('#call-status').hide();
}

// Xử lý tải video từ file
$('#video-upload').change((event) => {
    videoFile = event.target.files[0];
    if (videoFile) {
        $('#start-video').show();
    }
});

// Bắt đầu phát video từ file
$('#start-video').click(() => {
    if (!videoFile) return;
    $('#pause-video').show();

    const videoElement = document.getElementById('localStream');
    if (!isUsingFile) {
        // Nếu chưa phát, tạo stream và play
        const objectURL = URL.createObjectURL(videoFile);
        videoElement.src = objectURL;
        videoElement.play();
        isUsingFile = true;

        //Tạo stream từ video file
        videoElement.onloadeddata = () => {
            localStream = videoElement.captureStream();
        };
    } else if (isPaused) {
        // Nếu đang tạm dừng, tiếp tục phát
        videoElement.play();
    }

    isPaused = false;
});

// Dừng phát video từ file
$('#pause-video').click(() => {
    const videoElement = document.getElementById('localStream');
    videoElement.pause();
    isPaused = true;
    $('#pause-video').hide();
});

// Caller
$('#connect').click(() => {
    const Id = $('#remote-peer').val();
    handleStartCall(Id);
});

// Gọi cho user khác đang online
$('#listUser').on('click', '.user-item', function () {
    const Id = $(this).attr('id');
    handleStartCall(Id);
});

// Callee
peer.on('call', call => {
    handleIncomingCall(call);
});

// Sự kiện kết thúc cuộc gọi
$('#end-call').click(() => {
    username = getUsernamebypeerId(currentCall.peer);
    console.log("end call with ", username)
    endCall();
});

// Sự kiện nhận thông báo khi người dùng từ chối cuộc gọi
peer.on('connection', conn => {
    conn.on('data', data => {
        if (data.type === "call-rejected") {
            endCall();
            alert(data.message);
        }
    });
});

// Sự kiện logout
$('#logout').click(() => {
    socket.emit('logout');
    // socket.disconnect();
    peer.destroy();
    stopCameraAndVideo();
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

socket.on('list-all-user', (data) => {
    $('#listUser').empty(); // Xóa danh sách cũ
    userInfos = data.users;
    userStatus = data.status;
    userInfos.forEach(u => {
        const isBusy = userStatus[u.peerId] === "busy";
        console.log(u.username, " is busy or not: ", isBusy);
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