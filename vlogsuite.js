var YT_INITIAL_STATUS_POLLING_INTERVAL_MS = 15 * 1000;
var YT_CHANNELS_SERVICE_URL = 'https://www.googleapis.com/youtube/v3/channels';
var YT_VIDEOS_UPLOAD_SERVICE_URL = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
var YT_VIDEOS_SERVICE_URL = 'https://www.googleapis.com/youtube/v3/videos';
var YT_OAUTH2_CLIENT_ID = '521039963568-1e4snl1c3u5of2jg61cajhcsghnpeqjk.apps.googleusercontent.com';
var YT_OAUTH2_SCOPES = [
    'https://www.googleapis.com/auth/youtube',
];
var FB_OAUTH2_SCOPES = 'public_profile,email,publish_actions,user_photos,user_videos';
var FB_APP_ID = '266554620220222';
var fbAccessToken;
var ytAccessToken;
var fbConnection = false;
var ytConnection = false;
var platforms = {
    'facebook':{'connected':false,'uploaded':false},
    'youtube':{'connected':false,'uploaded':false}
};

var VLConstants = {
    YT_CONNECTED_EVENT : "ytConnected",
    FB_CONNECTED_EVENT : "fbConnected",
    YT_NOT_CONNECTED_EVENT : "ytNotConnected",
    FB_NOT_CONNECTED_EVENT : "fbNotConnected",
    YT_UPLOAD_PROGRESS_EVENT : "ytUploadProgress",
    YT_UPLOAD_COMPLETE_EVENT : "ytUploadComplete",
    YT_VIDEO_PROCESSING_PROGRESS_EVENT : "ytProcessingComplete",
    FB_UPLOAD_PROGRESS_EVENT : "fbUploadProgress",
    FB_UPLOAD_COMPLETE_EVENT : "fbUploadComplete",
    FB_VIDEO_PROCESSING_PROGRESS_EVENT : "fbProcessingComplete",
    LOGOUT_EVENT : "logout",
    ALL_UPLOADS_COMPLETE_EVENT : "allUploadsComplete"
    
}
		
		
/*
*********** YOUTUBE *****************
* INITIALIZE AND CONNECT 
*************************************
*/		
// Upon loading, the Google APIs JS client automatically invokes this callback.
handleClientLoad = function() {
    gapi.auth.init(function() {
        window.setTimeout(checkAuth(true), 1);
    });
}

// Attempt the immediate OAuth 2.0 client flow as soon as the page loads.
// If the currently logged-in Google Account has previously authorized
// the client specified as the OAUTH2_CLIENT_ID, then the authorization
// succeeds with no user intervention. Otherwise, it fails and the
// user interface that prompts for authorization needs to display.
// Sets "immediate" boolean
// Returns: 
//      callback function 
function checkAuth(immediate) {
    var _checkAuth = function() {
        gapi.auth.authorize({
            client_id: YT_OAUTH2_CLIENT_ID,
            scope: YT_OAUTH2_SCOPES,
            immediate: immediate
        }, handleAuthResult);
    };
    return _checkAuth;
}

// Handle the result of a gapi.auth.authorize() call.
function handleAuthResult(authResult) {
    console.log(authResult)
    if (authResult && !authResult.error) {
        // Authorization was successful. Hide authorization prompts and show
        // content that should be visible after authorization succeeds.
        ytConnection = true;
        ytAccessToken = gapi.auth.getToken().access_token;
        platforms.youtube.connected = true;
        loadAPIClientInterfaces();
    } else {
        // Can't connect
        var event = document.createEvent("Event");
        event.initEvent(VLConstants.YT_NOT_CONNECTED_EVENT,true,true);        
        document.dispatchEvent(event);
    }
}

function loadAPIClientInterfaces() {
  gapi.client.load('youtube', 'v3', function() {
    getInitialYTUserData();
  });
}
function getInitialYTUserData() {
    $.ajax({
        url: YT_CHANNELS_SERVICE_URL,
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + ytAccessToken
        },
        data: {
          part: 'snippet',
          mine: true
        }
      }).done(function(response) {
        var event = document.createEvent("Event");
        event.initEvent(VLConstants.YT_CONNECTED_EVENT,true,true);
        event.ytChannelName = response.items[0].snippet.title;
        event.ytChannelThumbURL  = response.items[0].snippet.thumbnails.default.url;

        document.dispatchEvent(event);
      });
    
}


/*
*********** FACEBOOK ****************
* INITIALIZE AND CONNECT 
*************************************
*/

window.fbAsyncInit = function() {
    FB.init({
        appId      : FB_APP_ID,
        cookie     : true,  // enable cookies to allow the server to access 
                        // the session
        xfbml      : false,  // parse social plugins on this page
        version    : 'v2.1' // use version 2.1
    });

    FB.getLoginStatus(function(response) {
        statusChangeCallback(response);
    });

};
      
// Load the SDK asynchronously
(function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "//connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

  // This is called with the results from from FB.getLoginStatus().
function statusChangeCallback(response) {
    console.log(response);
    if (response.status === 'connected') {
        // Logged into your app and Facebook.
        handleSuccesfulFBLogin(response);
    } else if (response.status === 'not_authorized') {
        // The person is logged into Facebook, but not your app.
        var event = document.createEvent("Event");
        event.initEvent(VLConstants.FB_NOT_CONNECTED_EVENT,true,true);        
        document.dispatchEvent(event);
    } else {
        // The person is not logged into Facebook, so we're not sure if
        // they are logged into this app or not.
        var event = document.createEvent("Event");
        event.initEvent(VLConstants.FB_NOT_CONNECTED_EVENT,true,true);        
        document.dispatchEvent(event);
    }
}
/*
* User was not connected, but chose to connect.  Going
* to try FB.login again and repeat the statusChangeCallback
*/
function doFBLogin() {
    FB.login(statusChangeCallback, {scope: FB_OAUTH2_SCOPES});
}

// Need to store this globally because of the nested FB API calls.
var fbProfileThumbURL;
function handleSuccesfulFBLogin(response) {
    fbConnection = true;
    fbAccessToken = response.authResponse.accessToken;
    platforms.facebook.connected = true;
    
    FB.api(
        "/me/picture",
        {
            "type": "square",
        },
        function (response) {
            if (response && !response.error) {
                fbProfileThumbURL = response.data.url;
                FB.api(
                    "/me?name",
                    function (response) {
                        if (response && !response.error) {
                            var event = document.createEvent("Event");
                            event.initEvent(VLConstants.FB_CONNECTED_EVENT,true,true);
                            event.fbProfileName = response.name;
                            event.fbProfileThumbURL = fbProfileThumbURL;
                            
                            document.dispatchEvent(event);
                        }
                    }
                );
            }
        }
    );
}

/*
*************************************
* LOGOUT FUNCTIONS 
*************************************
*/

function doYTLogout() {
    gapi.auth.signOut();
    ytAccessToken = null;
    ytConnection = false;
}

function doFBLogout() {
    FB.logout(function(response) {
        
    });
    fbAccessToken = null
    fbConnection = false;

}

function logoutAll() {
    if (fbConnection) {
        doFBLogout();
    }
    if (ytConnection) {
        doYTLogout();
    }
    var event = document.createEvent("Event");
    event.initEvent(VLConstants.LOGOUT_EVENT,true,true);        
    document.dispatchEvent(event);
}

/*
*************************************
* PERFORM VIDEO UPLOADS 
*************************************
*/

		
function initiateUploads(uploadData) {
    if (ytConnection) {
        if (uploadData.file) {
            var metadata = {
            
                snippet: {
                    title: uploadData.title,
                    description: uploadData.description,
                    tags: uploadData.tags,
                    categoryId: uploadData.categoryId
                },
                status: {
                    privacyStatus: "public",
                    license: "youtube",
                    embeddable: true,
                    publicStatsViewable: true
                }
            
            };
          
            $.ajax({
                url: YT_VIDEOS_UPLOAD_SERVICE_URL,
                method: 'POST',
                contentType: 'application/json',
                headers: {
                  Authorization: 'Bearer ' + ytAccessToken,
                  'x-upload-content-length': uploadData.file.size,
                  'x-upload-content-type': uploadData.file.type
                },
                data: JSON.stringify(metadata)
            }).done(function(data, textStatus, jqXHR) {
          
                resumableUpload({
                    url: jqXHR.getResponseHeader('Location'),
                    file: uploadData.file,
                    start: 0
                });
            
            });
        }
    }
    if (fbConnection) { 
        if (uploadData.file) { 
            //initiate FB upload
            var fd = new FormData();
            fd.append("source", uploadData.file);
            fd.append("access_token", fbAccessToken)
            var privacy = {value : uploadData.fbPrivacy}
            privacy = JSON.stringify(privacy)
            fd.append("privacy", privacy)
            fd.append("title", uploadData.title)
            fd.append("description", uploadData.description)
                
            var uploadRequest = new XMLHttpRequest();
            uploadRequest.addEventListener("load", fbUploadComplete, false);
            uploadRequest.addEventListener("error", fbUploadFailed, false);
            uploadRequest.upload.addEventListener("progress", fbUploadProgressUpdate, false);
            uploadRequest.upload.addEventListener("load", fbTransferComplete, false);
            uploadRequest.upload.addEventListener("error", fbTransferFailed, false);

            uploadRequest.open('POST', 'https://graph-video.facebook.com/me/videos?access_token=' + fbAccessToken, true);
            uploadRequest.send(fd)
        }
    }
}

/*
Allows for resuming a Youtube upload that failed due to
a bad connection or some other reason.  Also, has
a progress listener and updates the progress bar.
*/
function resumableUpload(options) {
    var ajax = $.ajax({
        url: options.url,
        method: 'PUT',
        contentType: options.file.type,
        headers: {
            'Content-Range': 'bytes ' + options.start + '-' + (options.file.size - 1) + '/' + options.file.size
        },
        xhr: function() {
            var xhr = $.ajaxSettings.xhr();

            if (xhr.upload) {
                xhr.upload.addEventListener(
                    'progress',
                    function(e) {
                        if(e.lengthComputable) {
                            var event = document.createEvent("Event");
                            event.initEvent(VLConstants.YT_UPLOAD_PROGRESS_EVENT,true,true);        
                            event.bytesTransferred = e.loaded;
                            event.totalBytes = e.total;
                            event.percentage = Math.round(100 * event.bytesTransferred / event.totalBytes);
                            document.dispatchEvent(event);
                        }
                    },
                    false
                );
            }

            return xhr;
        },
        processData: false,
        data: options.file
    });

    ajax.done(function(response) {
        var videoId = response.id;
        console.log('Video ID: ' + videoId);
        
        var event = document.createEvent("Event");
        event.initEvent(VLConstants.YT_UPLOAD_COMPLETE_EVENT,true,true);        
        event.ytVideoID = videoId;
        document.dispatchEvent(event);
        platforms.youtube.uploaded =true;
        checkAllUploadsComplete();
        checkVideoStatus(videoId, YT_INITIAL_STATUS_POLLING_INTERVAL_MS);
    });

    ajax.fail(function() {
        console.log('Failed');
        alert("Youtube video upload failed!")
        //$('#submit').click(function() {
        //    alert('Not yet implemented!');
        //});
        //$('#submit').val('Resume Upload');
        //$('#submit').attr('disabled', false);
    });
}

function checkVideoStatus(videoId, waitForNextPoll) {
    $.ajax({
        url: YT_VIDEOS_SERVICE_URL,
        method: 'GET',
        headers: {
            Authorization: 'Bearer ' + ytAccessToken
        },
        data: {
            part: 'status,processingDetails,player',
            id: videoId
        }
    }).done(function(response) {
        var processingStatus = response.items[0].processingDetails.processingStatus;
        if (processingStatus == 'processing') {
            setTimeout(function() {
                checkVideoStatus(videoId, waitForNextPoll * 2);
            }, waitForNextPoll);
        } 
    
        var event = document.createEvent("Event");
        event.initEvent(VLConstants.YT_VIDEO_PROCESSING_PROGRESS_EVENT,true,true);        
        event.ytVideoID = videoId;
        event.processingStatus = processingStatus;
        event.uploadStatus = response.items[0].status.uploadStatus;
        event.playerEmbedHtml = response.items[0].player.embedHtml
        document.dispatchEvent(event);
    });
}

function checkFBPostStatus(postId, waitForNextPoll) {
    var requestUrlPath = "/"+postId;
    FB.api(
        requestUrlPath,
        function (response) {
            console.log(response)
            var event = document.createEvent("Event");
            event.initEvent(VLConstants.FB_VIDEO_PROCESSING_PROGRESS_EVENT,true,true);
            if (response.embed_html.indexOf('width="0" height="0"') > -1) {
                event.processingStatus = 'processing';
                event.fbVideoPostId = postId;
                setTimeout(function() {
                    checkFBPostStatus(postId, waitForNextPoll * 2);
                }, waitForNextPoll);
            } 
            else {
                event.processingStatus = 'finished';
                event.fbVideoPostId = response.id;
                event.fbPlayerEmbedHtml= response.format[1].embed_html
            }

            document.dispatchEvent(event);
        }
    );
}

function fbUploadComplete(evt) {
    var responseJson = JSON.parse(evt.target.response);
    console.log("Facebook is putting the finishing touches on your video and will post it momentarily.");
    console.log("Video post ID: " + responseJson.id);
    
    var event = document.createEvent("Event");
    event.initEvent(VLConstants.FB_UPLOAD_COMPLETE_EVENT,true,true);        
    event.fbVideoPostID = responseJson.id;
    document.dispatchEvent(event);
    platforms.facebook.uploaded =true;
    checkAllUploadsComplete();
    checkFBPostStatus(responseJson.id, YT_INITIAL_STATUS_POLLING_INTERVAL_MS)
}

function fbUploadFailed(evt) {
    console.log("An error occurred while transferring the file.");
    alert('An error occurred while receiving a response from the server.')
}

// progress on transfers from the server to the client (downloads)
function fbUploadProgressUpdate (evt) {
    if (evt.lengthComputable) {
        var event = document.createEvent("Event");
        event.initEvent(VLConstants.FB_UPLOAD_PROGRESS_EVENT,true,true);        
        event.bytesTransferred = evt.loaded;
        event.totalBytes = evt.total;
        event.percentage = Math.round(100 * event.bytesTransferred / event.totalBytes);
        document.dispatchEvent(event);
    } else {
        // Unable to compute progress information since the total size is unknown
    }
}

function fbTransferComplete(evt) {
    console.log("u The transfer is complete.");
}
function fbTransferFailed(evt) {
    console.log("u An error occurred while transferring the file.");
    alert('An error occurred while uploading your video to the FB servers.')
}

function checkAllUploadsComplete() {
    for (var platform in platforms) {
        if (platforms[platform].connected && !platforms[platform].uploaded ) {
            return;
        }
    }
    var event = document.createEvent("Event");
    event.initEvent(VLConstants.ALL_UPLOADS_COMPLETE,true,true);        
    document.dispatchEvent(event);
}