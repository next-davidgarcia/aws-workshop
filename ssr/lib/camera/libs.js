/**
 * this code is from all around the web :)
 * if u want to put some credits u are welcome!
 */
var compatibility = (function(window, undefined) {
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    var lastTime = 0,
        isLittleEndian = true,

        URL = window.URL || window.webkitURL,

        requestAnimationFrame = function(callback, element) {
            var requestAnimationFrame =
                window.requestAnimationFrame        ||
                window.webkitRequestAnimationFrame  ||
                window.mozRequestAnimationFrame     ||
                window.oRequestAnimationFrame       ||
                window.msRequestAnimationFrame      ||
                function(callback, element) {
                    var currTime = new Date().getTime();
                    var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                    var id = window.setTimeout(function() {
                        callback(currTime + timeToCall);
                    }, timeToCall);
                    lastTime = currTime + timeToCall;
                    return id;
                };

            return requestAnimationFrame.call(window, callback, element);
        },

        cancelAnimationFrame = function(id) {
            var cancelAnimationFrame = window.cancelAnimationFrame ||
                function(id) {
                    clearTimeout(id);
                };
            return cancelAnimationFrame.call(window, id);
        },

        getUserMedia = function(options, success, error) {
            var getUserMedia =
                window.navigator.getUserMedia ||
                window.navigator.mozGetUserMedia ||
                window.navigator.webkitGetUserMedia ||
                window.navigator.msGetUserMedia ||
                function(options, success, error) {
                    error();
                };

            return getUserMedia.call(window.navigator, options, success, error);
        },

        detectEndian = function() {
            var buf = new ArrayBuffer(8);
            var data = new Uint32Array(buf);
            data[0] = 0xff000000;
            isLittleEndian = true;
            if (buf[0] === 0xff) {
                isLittleEndian = false;
            }
            return isLittleEndian;
        };

    return {
        URL: URL,
        requestAnimationFrame: requestAnimationFrame,
        cancelAnimationFrame: cancelAnimationFrame,
        getUserMedia: getUserMedia,
        detectEndian: detectEndian,
        AudioContext : AudioContext,
        isLittleEndian: isLittleEndian
    };
})(window);


/// adapter.js

(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.adapter = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
        /*
 *  Copyright (c) 2017 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
        /* eslint-env node */
        'use strict';

        var SDPUtils = require('sdp');

        function writeMediaSection(transceiver, caps, type, stream, dtlsRole) {
            var sdp = SDPUtils.writeRtpDescription(transceiver.kind, caps);

            // Map ICE parameters (ufrag, pwd) to SDP.
            sdp += SDPUtils.writeIceParameters(
                transceiver.iceGatherer.getLocalParameters());

            // Map DTLS parameters to SDP.
            sdp += SDPUtils.writeDtlsParameters(
                transceiver.dtlsTransport.getLocalParameters(),
                type === 'offer' ? 'actpass' : dtlsRole || 'active');

            sdp += 'a=mid:' + transceiver.mid + '\r\n';

            if (transceiver.direction) {
                sdp += 'a=' + transceiver.direction + '\r\n';
            } else if (transceiver.rtpSender && transceiver.rtpReceiver) {
                sdp += 'a=sendrecv\r\n';
            } else if (transceiver.rtpSender) {
                sdp += 'a=sendonly\r\n';
            } else if (transceiver.rtpReceiver) {
                sdp += 'a=recvonly\r\n';
            } else {
                sdp += 'a=inactive\r\n';
            }

            if (transceiver.rtpSender) {
                // spec.
                var msid = 'msid:' + stream.id + ' ' +
                    transceiver.rtpSender.track.id + '\r\n';
                sdp += 'a=' + msid;

                // for Chrome.
                sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].ssrc +
                    ' ' + msid;
                if (transceiver.sendEncodingParameters[0].rtx) {
                    sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].rtx.ssrc +
                        ' ' + msid;
                    sdp += 'a=ssrc-group:FID ' +
                        transceiver.sendEncodingParameters[0].ssrc + ' ' +
                        transceiver.sendEncodingParameters[0].rtx.ssrc +
                        '\r\n';
                }
            }
            // FIXME: this should be written by writeRtpDescription.
            sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].ssrc +
                ' cname:' + SDPUtils.localCName + '\r\n';
            if (transceiver.rtpSender && transceiver.sendEncodingParameters[0].rtx) {
                sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].rtx.ssrc +
                    ' cname:' + SDPUtils.localCName + '\r\n';
            }
            return sdp;
        }

// Edge does not like
// 1) stun: filtered after 14393 unless ?transport=udp is present
// 2) turn: that does not have all of turn:host:port?transport=udp
// 3) turn: with ipv6 addresses
// 4) turn: occurring muliple times
        function filterIceServers(iceServers, edgeVersion) {
            var hasTurn = false;
            iceServers = JSON.parse(JSON.stringify(iceServers));
            return iceServers.filter(function(server) {
                if (server && (server.urls || server.url)) {
                    var urls = server.urls || server.url;
                    if (server.url && !server.urls) {
                        console.warn('RTCIceServer.url is deprecated! Use urls instead.');
                    }
                    var isString = typeof urls === 'string';
                    if (isString) {
                        urls = [urls];
                    }
                    urls = urls.filter(function(url) {
                        var validTurn = url.indexOf('turn:') === 0 &&
                            url.indexOf('transport=udp') !== -1 &&
                            url.indexOf('turn:[') === -1 &&
                            !hasTurn;

                        if (validTurn) {
                            hasTurn = true;
                            return true;
                        }
                        return url.indexOf('stun:') === 0 && edgeVersion >= 14393 &&
                            url.indexOf('?transport=udp') === -1;
                    });

                    delete server.url;
                    server.urls = isString ? urls[0] : urls;
                    return !!urls.length;
                }
                return false;
            });
        }

// Determines the intersection of local and remote capabilities.
        function getCommonCapabilities(localCapabilities, remoteCapabilities) {
            var commonCapabilities = {
                codecs: [],
                headerExtensions: [],
                fecMechanisms: []
            };

            var findCodecByPayloadType = function(pt, codecs) {
                pt = parseInt(pt, 10);
                for (var i = 0; i < codecs.length; i++) {
                    if (codecs[i].payloadType === pt ||
                        codecs[i].preferredPayloadType === pt) {
                        return codecs[i];
                    }
                }
            };

            var rtxCapabilityMatches = function(lRtx, rRtx, lCodecs, rCodecs) {
                var lCodec = findCodecByPayloadType(lRtx.parameters.apt, lCodecs);
                var rCodec = findCodecByPayloadType(rRtx.parameters.apt, rCodecs);
                return lCodec && rCodec &&
                    lCodec.name.toLowerCase() === rCodec.name.toLowerCase();
            };

            localCapabilities.codecs.forEach(function(lCodec) {
                for (var i = 0; i < remoteCapabilities.codecs.length; i++) {
                    var rCodec = remoteCapabilities.codecs[i];
                    if (lCodec.name.toLowerCase() === rCodec.name.toLowerCase() &&
                        lCodec.clockRate === rCodec.clockRate) {
                        if (lCodec.name.toLowerCase() === 'rtx' &&
                            lCodec.parameters && rCodec.parameters.apt) {
                            // for RTX we need to find the local rtx that has a apt
                            // which points to the same local codec as the remote one.
                            if (!rtxCapabilityMatches(lCodec, rCodec,
                                localCapabilities.codecs, remoteCapabilities.codecs)) {
                                continue;
                            }
                        }
                        rCodec = JSON.parse(JSON.stringify(rCodec)); // deepcopy
                        // number of channels is the highest common number of channels
                        rCodec.numChannels = Math.min(lCodec.numChannels,
                            rCodec.numChannels);
                        // push rCodec so we reply with offerer payload type
                        commonCapabilities.codecs.push(rCodec);

                        // determine common feedback mechanisms
                        rCodec.rtcpFeedback = rCodec.rtcpFeedback.filter(function(fb) {
                            for (var j = 0; j < lCodec.rtcpFeedback.length; j++) {
                                if (lCodec.rtcpFeedback[j].type === fb.type &&
                                    lCodec.rtcpFeedback[j].parameter === fb.parameter) {
                                    return true;
                                }
                            }
                            return false;
                        });
                        // FIXME: also need to determine .parameters
                        //  see https://github.com/openpeer/ortc/issues/569
                        break;
                    }
                }
            });

            localCapabilities.headerExtensions.forEach(function(lHeaderExtension) {
                for (var i = 0; i < remoteCapabilities.headerExtensions.length;
                     i++) {
                    var rHeaderExtension = remoteCapabilities.headerExtensions[i];
                    if (lHeaderExtension.uri === rHeaderExtension.uri) {
                        commonCapabilities.headerExtensions.push(rHeaderExtension);
                        break;
                    }
                }
            });

            // FIXME: fecMechanisms
            return commonCapabilities;
        }

// is action=setLocalDescription with type allowed in signalingState
        function isActionAllowedInSignalingState(action, type, signalingState) {
            return {
                offer: {
                    setLocalDescription: ['stable', 'have-local-offer'],
                    setRemoteDescription: ['stable', 'have-remote-offer']
                },
                answer: {
                    setLocalDescription: ['have-remote-offer', 'have-local-pranswer'],
                    setRemoteDescription: ['have-local-offer', 'have-remote-pranswer']
                }
            }[type][action].indexOf(signalingState) !== -1;
        }

        function maybeAddCandidate(iceTransport, candidate) {
            // Edge's internal representation adds some fields therefore
            // not all fieldѕ are taken into account.
            var alreadyAdded = iceTransport.getRemoteCandidates()
                .find(function(remoteCandidate) {
                    return candidate.foundation === remoteCandidate.foundation &&
                        candidate.ip === remoteCandidate.ip &&
                        candidate.port === remoteCandidate.port &&
                        candidate.priority === remoteCandidate.priority &&
                        candidate.protocol === remoteCandidate.protocol &&
                        candidate.type === remoteCandidate.type;
                });
            if (!alreadyAdded) {
                iceTransport.addRemoteCandidate(candidate);
            }
            return !alreadyAdded;
        }

        module.exports = function(window, edgeVersion) {
            var RTCPeerConnection = function(config) {
                var self = this;

                var _eventTarget = document.createDocumentFragment();
                ['addEventListener', 'removeEventListener', 'dispatchEvent']
                    .forEach(function(method) {
                        self[method] = _eventTarget[method].bind(_eventTarget);
                    });

                this.onicecandidate = null;
                this.onaddstream = null;
                this.ontrack = null;
                this.onremovestream = null;
                this.onsignalingstatechange = null;
                this.oniceconnectionstatechange = null;
                this.onicegatheringstatechange = null;
                this.onnegotiationneeded = null;
                this.ondatachannel = null;
                this.canTrickleIceCandidates = null;

                this.needNegotiation = false;

                this.localStreams = [];
                this.remoteStreams = [];

                this.localDescription = null;
                this.remoteDescription = null;

                this.signalingState = 'stable';
                this.iceConnectionState = 'new';
                this.iceGatheringState = 'new';

                config = JSON.parse(JSON.stringify(config || {}));

                this.usingBundle = config.bundlePolicy === 'max-bundle';
                if (config.rtcpMuxPolicy === 'negotiate') {
                    var e = new Error('rtcpMuxPolicy \'negotiate\' is not supported');
                    e.name = 'NotSupportedError';
                    throw(e);
                } else if (!config.rtcpMuxPolicy) {
                    config.rtcpMuxPolicy = 'require';
                }

                switch (config.iceTransportPolicy) {
                    case 'all':
                    case 'relay':
                        break;
                    default:
                        config.iceTransportPolicy = 'all';
                        break;
                }

                switch (config.bundlePolicy) {
                    case 'balanced':
                    case 'max-compat':
                    case 'max-bundle':
                        break;
                    default:
                        config.bundlePolicy = 'balanced';
                        break;
                }

                config.iceServers = filterIceServers(config.iceServers || [], edgeVersion);

                this._iceGatherers = [];
                if (config.iceCandidatePoolSize) {
                    for (var i = config.iceCandidatePoolSize; i > 0; i--) {
                        this._iceGatherers = new window.RTCIceGatherer({
                            iceServers: config.iceServers,
                            gatherPolicy: config.iceTransportPolicy
                        });
                    }
                } else {
                    config.iceCandidatePoolSize = 0;
                }

                this._config = config;

                // per-track iceGathers, iceTransports, dtlsTransports, rtpSenders, ...
                // everything that is needed to describe a SDP m-line.
                this.transceivers = [];

                this._sdpSessionId = SDPUtils.generateSessionId();
                this._sdpSessionVersion = 0;

                this._dtlsRole = undefined; // role for a=setup to use in answers.
            };

            RTCPeerConnection.prototype._emitGatheringStateChange = function() {
                var event = new Event('icegatheringstatechange');
                this.dispatchEvent(event);
                if (typeof this.onicegatheringstatechange === 'function') {
                    this.onicegatheringstatechange(event);
                }
            };

            RTCPeerConnection.prototype.getConfiguration = function() {
                return this._config;
            };

            RTCPeerConnection.prototype.getLocalStreams = function() {
                return this.localStreams;
            };

            RTCPeerConnection.prototype.getRemoteStreams = function() {
                return this.remoteStreams;
            };

            // internal helper to create a transceiver object.
            // (whih is not yet the same as the WebRTC 1.0 transceiver)
            RTCPeerConnection.prototype._createTransceiver = function(kind) {
                var hasBundleTransport = this.transceivers.length > 0;
                var transceiver = {
                    track: null,
                    iceGatherer: null,
                    iceTransport: null,
                    dtlsTransport: null,
                    localCapabilities: null,
                    remoteCapabilities: null,
                    rtpSender: null,
                    rtpReceiver: null,
                    kind: kind,
                    mid: null,
                    sendEncodingParameters: null,
                    recvEncodingParameters: null,
                    stream: null,
                    wantReceive: true
                };
                if (this.usingBundle && hasBundleTransport) {
                    transceiver.iceTransport = this.transceivers[0].iceTransport;
                    transceiver.dtlsTransport = this.transceivers[0].dtlsTransport;
                } else {
                    var transports = this._createIceAndDtlsTransports();
                    transceiver.iceTransport = transports.iceTransport;
                    transceiver.dtlsTransport = transports.dtlsTransport;
                }
                this.transceivers.push(transceiver);
                return transceiver;
            };

            RTCPeerConnection.prototype.addTrack = function(track, stream) {
                var transceiver;
                for (var i = 0; i < this.transceivers.length; i++) {
                    if (!this.transceivers[i].track &&
                        this.transceivers[i].kind === track.kind) {
                        transceiver = this.transceivers[i];
                    }
                }
                if (!transceiver) {
                    transceiver = this._createTransceiver(track.kind);
                }

                this._maybeFireNegotiationNeeded();

                if (this.localStreams.indexOf(stream) === -1) {
                    this.localStreams.push(stream);
                }

                transceiver.track = track;
                transceiver.stream = stream;
                transceiver.rtpSender = new window.RTCRtpSender(track,
                    transceiver.dtlsTransport);
                return transceiver.rtpSender;
            };

            RTCPeerConnection.prototype.addStream = function(stream) {
                var self = this;
                if (edgeVersion >= 15025) {
                    stream.getTracks().forEach(function(track) {
                        self.addTrack(track, stream);
                    });
                } else {
                    // Clone is necessary for local demos mostly, attaching directly
                    // to two different senders does not work (build 10547).
                    // Fixed in 15025 (or earlier)
                    var clonedStream = stream.clone();
                    stream.getTracks().forEach(function(track, idx) {
                        var clonedTrack = clonedStream.getTracks()[idx];
                        track.addEventListener('enabled', function(event) {
                            clonedTrack.enabled = event.enabled;
                        });
                    });
                    clonedStream.getTracks().forEach(function(track) {
                        self.addTrack(track, clonedStream);
                    });
                }
            };

            RTCPeerConnection.prototype.removeStream = function(stream) {
                var idx = this.localStreams.indexOf(stream);
                if (idx > -1) {
                    this.localStreams.splice(idx, 1);
                    this._maybeFireNegotiationNeeded();
                }
            };

            RTCPeerConnection.prototype.getSenders = function() {
                return this.transceivers.filter(function(transceiver) {
                    return !!transceiver.rtpSender;
                })
                    .map(function(transceiver) {
                        return transceiver.rtpSender;
                    });
            };

            RTCPeerConnection.prototype.getReceivers = function() {
                return this.transceivers.filter(function(transceiver) {
                    return !!transceiver.rtpReceiver;
                })
                    .map(function(transceiver) {
                        return transceiver.rtpReceiver;
                    });
            };


            RTCPeerConnection.prototype._createIceGatherer = function(sdpMLineIndex,
                                                                      usingBundle) {
                var self = this;
                if (usingBundle && sdpMLineIndex > 0) {
                    return this.transceivers[0].iceGatherer;
                } else if (this._iceGatherers.length) {
                    return this._iceGatherers.shift();
                }
                var iceGatherer = new window.RTCIceGatherer({
                    iceServers: this._config.iceServers,
                    gatherPolicy: this._config.iceTransportPolicy
                });
                Object.defineProperty(iceGatherer, 'state',
                    {value: 'new', writable: true}
                );

                this.transceivers[sdpMLineIndex].candidates = [];
                this.transceivers[sdpMLineIndex].bufferCandidates = function(event) {
                    var end = !event.candidate || Object.keys(event.candidate).length === 0;
                    // polyfill since RTCIceGatherer.state is not implemented in
                    // Edge 10547 yet.
                    iceGatherer.state = end ? 'completed' : 'gathering';
                    if (self.transceivers[sdpMLineIndex].candidates !== null) {
                        self.transceivers[sdpMLineIndex].candidates.push(event.candidate);
                    }
                };
                iceGatherer.addEventListener('localcandidate',
                    this.transceivers[sdpMLineIndex].bufferCandidates);
                return iceGatherer;
            };

            // start gathering from an RTCIceGatherer.
            RTCPeerConnection.prototype._gather = function(mid, sdpMLineIndex) {
                var self = this;
                var iceGatherer = this.transceivers[sdpMLineIndex].iceGatherer;
                if (iceGatherer.onlocalcandidate) {
                    return;
                }
                var candidates = this.transceivers[sdpMLineIndex].candidates;
                this.transceivers[sdpMLineIndex].candidates = null;
                iceGatherer.removeEventListener('localcandidate',
                    this.transceivers[sdpMLineIndex].bufferCandidates);
                iceGatherer.onlocalcandidate = function(evt) {
                    if (self.usingBundle && sdpMLineIndex > 0) {
                        // if we know that we use bundle we can drop candidates with
                        // ѕdpMLineIndex > 0. If we don't do this then our state gets
                        // confused since we dispose the extra ice gatherer.
                        return;
                    }
                    var event = new Event('icecandidate');
                    event.candidate = {sdpMid: mid, sdpMLineIndex: sdpMLineIndex};

                    var cand = evt.candidate;
                    // Edge emits an empty object for RTCIceCandidateComplete‥
                    var end = !cand || Object.keys(cand).length === 0;
                    if (end) {
                        // polyfill since RTCIceGatherer.state is not implemented in
                        // Edge 10547 yet.
                        if (iceGatherer.state === 'new' || iceGatherer.state === 'gathering') {
                            iceGatherer.state = 'completed';
                        }
                    } else {
                        if (iceGatherer.state === 'new') {
                            iceGatherer.state = 'gathering';
                        }
                        // RTCIceCandidate doesn't have a component, needs to be added
                        cand.component = 1;
                        event.candidate.candidate = SDPUtils.writeCandidate(cand);
                    }

                    // update local description.
                    var sections = SDPUtils.splitSections(self.localDescription.sdp);
                    if (!end) {
                        sections[event.candidate.sdpMLineIndex + 1] +=
                            'a=' + event.candidate.candidate + '\r\n';
                    } else {
                        sections[event.candidate.sdpMLineIndex + 1] +=
                            'a=end-of-candidates\r\n';
                    }
                    self.localDescription.sdp = sections.join('');
                    var complete = self.transceivers.every(function(transceiver) {
                        return transceiver.iceGatherer &&
                            transceiver.iceGatherer.state === 'completed';
                    });

                    if (self.iceGatheringState !== 'gathering') {
                        self.iceGatheringState = 'gathering';
                        self._emitGatheringStateChange();
                    }

                    // Emit candidate. Also emit null candidate when all gatherers are
                    // complete.
                    if (!end) {
                        self.dispatchEvent(event);
                        if (typeof self.onicecandidate === 'function') {
                            self.onicecandidate(event);
                        }
                    }
                    if (complete) {
                        self.dispatchEvent(new Event('icecandidate'));
                        if (typeof self.onicecandidate === 'function') {
                            self.onicecandidate(new Event('icecandidate'));
                        }
                        self.iceGatheringState = 'complete';
                        self._emitGatheringStateChange();
                    }
                };

                // emit already gathered candidates.
                window.setTimeout(function() {
                    candidates.forEach(function(candidate) {
                        var e = new Event('RTCIceGatherEvent');
                        e.candidate = candidate;
                        iceGatherer.onlocalcandidate(e);
                    });
                }, 0);
            };

            // Create ICE transport and DTLS transport.
            RTCPeerConnection.prototype._createIceAndDtlsTransports = function() {
                var self = this;
                var iceTransport = new window.RTCIceTransport(null);
                iceTransport.onicestatechange = function() {
                    self._updateConnectionState();
                };

                var dtlsTransport = new window.RTCDtlsTransport(iceTransport);
                dtlsTransport.ondtlsstatechange = function() {
                    self._updateConnectionState();
                };
                dtlsTransport.onerror = function() {
                    // onerror does not set state to failed by itself.
                    Object.defineProperty(dtlsTransport, 'state',
                        {value: 'failed', writable: true});
                    self._updateConnectionState();
                };

                return {
                    iceTransport: iceTransport,
                    dtlsTransport: dtlsTransport
                };
            };

            // Destroy ICE gatherer, ICE transport and DTLS transport.
            // Without triggering the callbacks.
            RTCPeerConnection.prototype._disposeIceAndDtlsTransports = function(
                sdpMLineIndex) {
                var iceGatherer = this.transceivers[sdpMLineIndex].iceGatherer;
                if (iceGatherer) {
                    delete iceGatherer.onlocalcandidate;
                    delete this.transceivers[sdpMLineIndex].iceGatherer;
                }
                var iceTransport = this.transceivers[sdpMLineIndex].iceTransport;
                if (iceTransport) {
                    delete iceTransport.onicestatechange;
                    delete this.transceivers[sdpMLineIndex].iceTransport;
                }
                var dtlsTransport = this.transceivers[sdpMLineIndex].dtlsTransport;
                if (dtlsTransport) {
                    delete dtlsTransport.ondtlsstatechange;
                    delete dtlsTransport.onerror;
                    delete this.transceivers[sdpMLineIndex].dtlsTransport;
                }
            };

            // Start the RTP Sender and Receiver for a transceiver.
            RTCPeerConnection.prototype._transceive = function(transceiver,
                                                               send, recv) {
                var params = getCommonCapabilities(transceiver.localCapabilities,
                    transceiver.remoteCapabilities);
                if (send && transceiver.rtpSender) {
                    params.encodings = transceiver.sendEncodingParameters;
                    params.rtcp = {
                        cname: SDPUtils.localCName,
                        compound: transceiver.rtcpParameters.compound
                    };
                    if (transceiver.recvEncodingParameters.length) {
                        params.rtcp.ssrc = transceiver.recvEncodingParameters[0].ssrc;
                    }
                    transceiver.rtpSender.send(params);
                }
                if (recv && transceiver.rtpReceiver && params.codecs.length > 0) {
                    // remove RTX field in Edge 14942
                    if (transceiver.kind === 'video'
                        && transceiver.recvEncodingParameters
                        && edgeVersion < 15019) {
                        transceiver.recvEncodingParameters.forEach(function(p) {
                            delete p.rtx;
                        });
                    }
                    params.encodings = transceiver.recvEncodingParameters;
                    params.rtcp = {
                        cname: transceiver.rtcpParameters.cname,
                        compound: transceiver.rtcpParameters.compound
                    };
                    if (transceiver.sendEncodingParameters.length) {
                        params.rtcp.ssrc = transceiver.sendEncodingParameters[0].ssrc;
                    }
                    transceiver.rtpReceiver.receive(params);
                }
            };

            RTCPeerConnection.prototype.setLocalDescription = function(description) {
                var self = this;
                var args = arguments;

                if (!isActionAllowedInSignalingState('setLocalDescription',
                    description.type, this.signalingState)) {
                    return new Promise(function(resolve, reject) {
                        var e = new Error('Can not set local ' + description.type +
                            ' in state ' + self.signalingState);
                        e.name = 'InvalidStateError';
                        if (args.length > 2 && typeof args[2] === 'function') {
                            args[2].apply(null, [e]);
                        }
                        reject(e);
                    });
                }

                var sections;
                var sessionpart;
                if (description.type === 'offer') {
                    // VERY limited support for SDP munging. Limited to:
                    // * changing the order of codecs
                    sections = SDPUtils.splitSections(description.sdp);
                    sessionpart = sections.shift();
                    sections.forEach(function(mediaSection, sdpMLineIndex) {
                        var caps = SDPUtils.parseRtpParameters(mediaSection);
                        self.transceivers[sdpMLineIndex].localCapabilities = caps;
                    });

                    this.transceivers.forEach(function(transceiver, sdpMLineIndex) {
                        self._gather(transceiver.mid, sdpMLineIndex);
                    });
                } else if (description.type === 'answer') {
                    sections = SDPUtils.splitSections(self.remoteDescription.sdp);
                    sessionpart = sections.shift();
                    var isIceLite = SDPUtils.matchPrefix(sessionpart,
                        'a=ice-lite').length > 0;
                    sections.forEach(function(mediaSection, sdpMLineIndex) {
                        var transceiver = self.transceivers[sdpMLineIndex];
                        var iceGatherer = transceiver.iceGatherer;
                        var iceTransport = transceiver.iceTransport;
                        var dtlsTransport = transceiver.dtlsTransport;
                        var localCapabilities = transceiver.localCapabilities;
                        var remoteCapabilities = transceiver.remoteCapabilities;

                        // treat bundle-only as not-rejected.
                        var rejected = SDPUtils.isRejected(mediaSection) &&
                            !SDPUtils.matchPrefix(mediaSection, 'a=bundle-only').length === 1;

                        if (!rejected && !transceiver.isDatachannel) {
                            var remoteIceParameters = SDPUtils.getIceParameters(
                                mediaSection, sessionpart);
                            var remoteDtlsParameters = SDPUtils.getDtlsParameters(
                                mediaSection, sessionpart);
                            if (isIceLite) {
                                remoteDtlsParameters.role = 'server';
                            }

                            if (!self.usingBundle || sdpMLineIndex === 0) {
                                self._gather(transceiver.mid, sdpMLineIndex);
                                if (iceTransport.state === 'new') {
                                    iceTransport.start(iceGatherer, remoteIceParameters,
                                        isIceLite ? 'controlling' : 'controlled');
                                }
                                if (dtlsTransport.state === 'new') {
                                    dtlsTransport.start(remoteDtlsParameters);
                                }
                            }

                            // Calculate intersection of capabilities.
                            var params = getCommonCapabilities(localCapabilities,
                                remoteCapabilities);

                            // Start the RTCRtpSender. The RTCRtpReceiver for this
                            // transceiver has already been started in setRemoteDescription.
                            self._transceive(transceiver,
                                params.codecs.length > 0,
                                false);
                        }
                    });
                }

                this.localDescription = {
                    type: description.type,
                    sdp: description.sdp
                };
                switch (description.type) {
                    case 'offer':
                        this._updateSignalingState('have-local-offer');
                        break;
                    case 'answer':
                        this._updateSignalingState('stable');
                        break;
                    default:
                        throw new TypeError('unsupported type "' + description.type +
                            '"');
                }

                // If a success callback was provided, emit ICE candidates after it
                // has been executed. Otherwise, emit callback after the Promise is
                // resolved.
                var cb = arguments.length > 1 && typeof arguments[1] === 'function' &&
                    arguments[1];
                return new Promise(function(resolve) {
                    if (cb) {
                        cb.apply(null);
                    }
                    resolve();
                });
            };

            RTCPeerConnection.prototype.setRemoteDescription = function(description) {
                var self = this;
                var args = arguments;

                if (!isActionAllowedInSignalingState('setRemoteDescription',
                    description.type, this.signalingState)) {
                    return new Promise(function(resolve, reject) {
                        var e = new Error('Can not set remote ' + description.type +
                            ' in state ' + self.signalingState);
                        e.name = 'InvalidStateError';
                        if (args.length > 2 && typeof args[2] === 'function') {
                            args[2].apply(null, [e]);
                        }
                        reject(e);
                    });
                }

                var streams = {};
                this.remoteStreams.forEach(function(stream) {
                    streams[stream.id] = stream;
                });
                var receiverList = [];
                var sections = SDPUtils.splitSections(description.sdp);
                var sessionpart = sections.shift();
                var isIceLite = SDPUtils.matchPrefix(sessionpart,
                    'a=ice-lite').length > 0;
                var usingBundle = SDPUtils.matchPrefix(sessionpart,
                    'a=group:BUNDLE ').length > 0;
                this.usingBundle = usingBundle;
                var iceOptions = SDPUtils.matchPrefix(sessionpart,
                    'a=ice-options:')[0];
                if (iceOptions) {
                    this.canTrickleIceCandidates = iceOptions.substr(14).split(' ')
                        .indexOf('trickle') >= 0;
                } else {
                    this.canTrickleIceCandidates = false;
                }

                sections.forEach(function(mediaSection, sdpMLineIndex) {
                    var lines = SDPUtils.splitLines(mediaSection);
                    var kind = SDPUtils.getKind(mediaSection);
                    // treat bundle-only as not-rejected.
                    var rejected = SDPUtils.isRejected(mediaSection) &&
                        !SDPUtils.matchPrefix(mediaSection, 'a=bundle-only').length === 1;
                    var protocol = lines[0].substr(2).split(' ')[2];

                    var direction = SDPUtils.getDirection(mediaSection, sessionpart);
                    var remoteMsid = SDPUtils.parseMsid(mediaSection);

                    var mid = SDPUtils.getMid(mediaSection) || SDPUtils.generateIdentifier();

                    // Reject datachannels which are not implemented yet.
                    if (kind === 'application' && protocol === 'DTLS/SCTP') {
                        self.transceivers[sdpMLineIndex] = {
                            mid: mid,
                            isDatachannel: true
                        };
                        return;
                    }

                    var transceiver;
                    var iceGatherer;
                    var iceTransport;
                    var dtlsTransport;
                    var rtpReceiver;
                    var sendEncodingParameters;
                    var recvEncodingParameters;
                    var localCapabilities;

                    var track;
                    // FIXME: ensure the mediaSection has rtcp-mux set.
                    var remoteCapabilities = SDPUtils.parseRtpParameters(mediaSection);
                    var remoteIceParameters;
                    var remoteDtlsParameters;
                    if (!rejected) {
                        remoteIceParameters = SDPUtils.getIceParameters(mediaSection,
                            sessionpart);
                        remoteDtlsParameters = SDPUtils.getDtlsParameters(mediaSection,
                            sessionpart);
                        remoteDtlsParameters.role = 'client';
                    }
                    recvEncodingParameters =
                        SDPUtils.parseRtpEncodingParameters(mediaSection);

                    var rtcpParameters = SDPUtils.parseRtcpParameters(mediaSection);

                    var isComplete = SDPUtils.matchPrefix(mediaSection,
                        'a=end-of-candidates', sessionpart).length > 0;
                    var cands = SDPUtils.matchPrefix(mediaSection, 'a=candidate:')
                        .map(function(cand) {
                            return SDPUtils.parseCandidate(cand);
                        })
                        .filter(function(cand) {
                            return cand.component === 1;
                        });

                    // Check if we can use BUNDLE and dispose transports.
                    if ((description.type === 'offer' || description.type === 'answer') &&
                        !rejected && usingBundle && sdpMLineIndex > 0 &&
                        self.transceivers[sdpMLineIndex]) {
                        self._disposeIceAndDtlsTransports(sdpMLineIndex);
                        self.transceivers[sdpMLineIndex].iceGatherer =
                            self.transceivers[0].iceGatherer;
                        self.transceivers[sdpMLineIndex].iceTransport =
                            self.transceivers[0].iceTransport;
                        self.transceivers[sdpMLineIndex].dtlsTransport =
                            self.transceivers[0].dtlsTransport;
                        if (self.transceivers[sdpMLineIndex].rtpSender) {
                            self.transceivers[sdpMLineIndex].rtpSender.setTransport(
                                self.transceivers[0].dtlsTransport);
                        }
                        if (self.transceivers[sdpMLineIndex].rtpReceiver) {
                            self.transceivers[sdpMLineIndex].rtpReceiver.setTransport(
                                self.transceivers[0].dtlsTransport);
                        }
                    }
                    if (description.type === 'offer' && !rejected) {
                        transceiver = self.transceivers[sdpMLineIndex] ||
                            self._createTransceiver(kind);
                        transceiver.mid = mid;

                        if (!transceiver.iceGatherer) {
                            transceiver.iceGatherer = self._createIceGatherer(sdpMLineIndex,
                                usingBundle);
                        }

                        if (cands.length && transceiver.iceTransport.state === 'new') {
                            if (isComplete && (!usingBundle || sdpMLineIndex === 0)) {
                                transceiver.iceTransport.setRemoteCandidates(cands);
                            } else {
                                cands.forEach(function(candidate) {
                                    maybeAddCandidate(transceiver.iceTransport, candidate);
                                });
                            }
                        }

                        localCapabilities = window.RTCRtpReceiver.getCapabilities(kind);

                        // filter RTX until additional stuff needed for RTX is implemented
                        // in adapter.js
                        if (edgeVersion < 15019) {
                            localCapabilities.codecs = localCapabilities.codecs.filter(
                                function(codec) {
                                    return codec.name !== 'rtx';
                                });
                        }

                        sendEncodingParameters = transceiver.sendEncodingParameters || [{
                            ssrc: (2 * sdpMLineIndex + 2) * 1001
                        }];

                        var isNewTrack = false;
                        if (direction === 'sendrecv' || direction === 'sendonly') {
                            isNewTrack = !transceiver.rtpReceiver;
                            rtpReceiver = transceiver.rtpReceiver ||
                                new window.RTCRtpReceiver(transceiver.dtlsTransport, kind);

                            if (isNewTrack) {
                                var stream;
                                track = rtpReceiver.track;
                                // FIXME: does not work with Plan B.
                                if (remoteMsid) {
                                    if (!streams[remoteMsid.stream]) {
                                        streams[remoteMsid.stream] = new window.MediaStream();
                                        Object.defineProperty(streams[remoteMsid.stream], 'id', {
                                            get: function() {
                                                return remoteMsid.stream;
                                            }
                                        });
                                    }
                                    Object.defineProperty(track, 'id', {
                                        get: function() {
                                            return remoteMsid.track;
                                        }
                                    });
                                    stream = streams[remoteMsid.stream];
                                } else {
                                    if (!streams.default) {
                                        streams.default = new window.MediaStream();
                                    }
                                    stream = streams.default;
                                }
                                stream.addTrack(track);
                                receiverList.push([track, rtpReceiver, stream]);
                            }
                        }

                        transceiver.localCapabilities = localCapabilities;
                        transceiver.remoteCapabilities = remoteCapabilities;
                        transceiver.rtpReceiver = rtpReceiver;
                        transceiver.rtcpParameters = rtcpParameters;
                        transceiver.sendEncodingParameters = sendEncodingParameters;
                        transceiver.recvEncodingParameters = recvEncodingParameters;

                        // Start the RTCRtpReceiver now. The RTPSender is started in
                        // setLocalDescription.
                        self._transceive(self.transceivers[sdpMLineIndex],
                            false,
                            isNewTrack);
                    } else if (description.type === 'answer' && !rejected) {
                        transceiver = self.transceivers[sdpMLineIndex];
                        iceGatherer = transceiver.iceGatherer;
                        iceTransport = transceiver.iceTransport;
                        dtlsTransport = transceiver.dtlsTransport;
                        rtpReceiver = transceiver.rtpReceiver;
                        sendEncodingParameters = transceiver.sendEncodingParameters;
                        localCapabilities = transceiver.localCapabilities;

                        self.transceivers[sdpMLineIndex].recvEncodingParameters =
                            recvEncodingParameters;
                        self.transceivers[sdpMLineIndex].remoteCapabilities =
                            remoteCapabilities;
                        self.transceivers[sdpMLineIndex].rtcpParameters = rtcpParameters;

                        if (cands.length && iceTransport.state === 'new') {
                            if ((isIceLite || isComplete) &&
                                (!usingBundle || sdpMLineIndex === 0)) {
                                iceTransport.setRemoteCandidates(cands);
                            } else {
                                cands.forEach(function(candidate) {
                                    maybeAddCandidate(transceiver.iceTransport, candidate);
                                });
                            }
                        }

                        if (!usingBundle || sdpMLineIndex === 0) {
                            if (iceTransport.state === 'new') {
                                iceTransport.start(iceGatherer, remoteIceParameters,
                                    'controlling');
                            }
                            if (dtlsTransport.state === 'new') {
                                dtlsTransport.start(remoteDtlsParameters);
                            }
                        }

                        self._transceive(transceiver,
                            direction === 'sendrecv' || direction === 'recvonly',
                            direction === 'sendrecv' || direction === 'sendonly');

                        if (rtpReceiver &&
                            (direction === 'sendrecv' || direction === 'sendonly')) {
                            track = rtpReceiver.track;
                            if (remoteMsid) {
                                if (!streams[remoteMsid.stream]) {
                                    streams[remoteMsid.stream] = new window.MediaStream();
                                }
                                streams[remoteMsid.stream].addTrack(track);
                                receiverList.push([track, rtpReceiver, streams[remoteMsid.stream]]);
                            } else {
                                if (!streams.default) {
                                    streams.default = new window.MediaStream();
                                }
                                streams.default.addTrack(track);
                                receiverList.push([track, rtpReceiver, streams.default]);
                            }
                        } else {
                            // FIXME: actually the receiver should be created later.
                            delete transceiver.rtpReceiver;
                        }
                    }
                });

                if (this._dtlsRole === undefined) {
                    this._dtlsRole = description.type === 'offer' ? 'active' : 'passive';
                }

                this.remoteDescription = {
                    type: description.type,
                    sdp: description.sdp
                };
                switch (description.type) {
                    case 'offer':
                        this._updateSignalingState('have-remote-offer');
                        break;
                    case 'answer':
                        this._updateSignalingState('stable');
                        break;
                    default:
                        throw new TypeError('unsupported type "' + description.type +
                            '"');
                }
                Object.keys(streams).forEach(function(sid) {
                    var stream = streams[sid];
                    if (stream.getTracks().length) {
                        if (self.remoteStreams.indexOf(stream) === -1) {
                            self.remoteStreams.push(stream);
                            var event = new Event('addstream');
                            event.stream = stream;
                            window.setTimeout(function() {
                                self.dispatchEvent(event);
                                if (typeof self.onaddstream === 'function') {
                                    self.onaddstream(event);
                                }
                            });
                        }

                        receiverList.forEach(function(item) {
                            var track = item[0];
                            var receiver = item[1];
                            if (stream.id !== item[2].id) {
                                return;
                            }
                            var trackEvent = new Event('track');
                            trackEvent.track = track;
                            trackEvent.receiver = receiver;
                            trackEvent.transceiver = {receiver: receiver};
                            trackEvent.streams = [stream];
                            window.setTimeout(function() {
                                self.dispatchEvent(trackEvent);
                                if (typeof self.ontrack === 'function') {
                                    self.ontrack(trackEvent);
                                }
                            });
                        });
                    }
                });

                // check whether addIceCandidate({}) was called within four seconds after
                // setRemoteDescription.
                window.setTimeout(function() {
                    if (!(self && self.transceivers)) {
                        return;
                    }
                    self.transceivers.forEach(function(transceiver) {
                        if (transceiver.iceTransport &&
                            transceiver.iceTransport.state === 'new' &&
                            transceiver.iceTransport.getRemoteCandidates().length > 0) {
                            console.warn('Timeout for addRemoteCandidate. Consider sending ' +
                                'an end-of-candidates notification');
                            transceiver.iceTransport.addRemoteCandidate({});
                        }
                    });
                }, 4000);

                return new Promise(function(resolve) {
                    if (args.length > 1 && typeof args[1] === 'function') {
                        args[1].apply(null);
                    }
                    resolve();
                });
            };

            RTCPeerConnection.prototype.close = function() {
                this.transceivers.forEach(function(transceiver) {
                    /* not yet
      if (transceiver.iceGatherer) {
        transceiver.iceGatherer.close();
      }
      */
                    if (transceiver.iceTransport) {
                        transceiver.iceTransport.stop();
                    }
                    if (transceiver.dtlsTransport) {
                        transceiver.dtlsTransport.stop();
                    }
                    if (transceiver.rtpSender) {
                        transceiver.rtpSender.stop();
                    }
                    if (transceiver.rtpReceiver) {
                        transceiver.rtpReceiver.stop();
                    }
                });
                // FIXME: clean up tracks, local streams, remote streams, etc
                this._updateSignalingState('closed');
            };

            // Update the signaling state.
            RTCPeerConnection.prototype._updateSignalingState = function(newState) {
                this.signalingState = newState;
                var event = new Event('signalingstatechange');
                this.dispatchEvent(event);
                if (typeof this.onsignalingstatechange === 'function') {
                    this.onsignalingstatechange(event);
                }
            };

            // Determine whether to fire the negotiationneeded event.
            RTCPeerConnection.prototype._maybeFireNegotiationNeeded = function() {
                var self = this;
                if (this.signalingState !== 'stable' || this.needNegotiation === true) {
                    return;
                }
                this.needNegotiation = true;
                window.setTimeout(function() {
                    if (self.needNegotiation === false) {
                        return;
                    }
                    self.needNegotiation = false;
                    var event = new Event('negotiationneeded');
                    self.dispatchEvent(event);
                    if (typeof self.onnegotiationneeded === 'function') {
                        self.onnegotiationneeded(event);
                    }
                }, 0);
            };

            // Update the connection state.
            RTCPeerConnection.prototype._updateConnectionState = function() {
                var newState;
                var states = {
                    'new': 0,
                    closed: 0,
                    connecting: 0,
                    checking: 0,
                    connected: 0,
                    completed: 0,
                    disconnected: 0,
                    failed: 0
                };
                this.transceivers.forEach(function(transceiver) {
                    states[transceiver.iceTransport.state]++;
                    states[transceiver.dtlsTransport.state]++;
                });
                // ICETransport.completed and connected are the same for this purpose.
                states.connected += states.completed;

                newState = 'new';
                if (states.failed > 0) {
                    newState = 'failed';
                } else if (states.connecting > 0 || states.checking > 0) {
                    newState = 'connecting';
                } else if (states.disconnected > 0) {
                    newState = 'disconnected';
                } else if (states.new > 0) {
                    newState = 'new';
                } else if (states.connected > 0 || states.completed > 0) {
                    newState = 'connected';
                }

                if (newState !== this.iceConnectionState) {
                    this.iceConnectionState = newState;
                    var event = new Event('iceconnectionstatechange');
                    this.dispatchEvent(event);
                    if (typeof this.oniceconnectionstatechange === 'function') {
                        this.oniceconnectionstatechange(event);
                    }
                }
            };

            RTCPeerConnection.prototype.createOffer = function() {
                var self = this;
                var args = arguments;

                var offerOptions;
                if (arguments.length === 1 && typeof arguments[0] !== 'function') {
                    offerOptions = arguments[0];
                } else if (arguments.length === 3) {
                    offerOptions = arguments[2];
                }

                var numAudioTracks = this.transceivers.filter(function(t) {
                    return t.kind === 'audio';
                }).length;
                var numVideoTracks = this.transceivers.filter(function(t) {
                    return t.kind === 'video';
                }).length;

                // Determine number of audio and video tracks we need to send/recv.
                if (offerOptions) {
                    // Reject Chrome legacy constraints.
                    if (offerOptions.mandatory || offerOptions.optional) {
                        throw new TypeError(
                            'Legacy mandatory/optional constraints not supported.');
                    }
                    if (offerOptions.offerToReceiveAudio !== undefined) {
                        if (offerOptions.offerToReceiveAudio === true) {
                            numAudioTracks = 1;
                        } else if (offerOptions.offerToReceiveAudio === false) {
                            numAudioTracks = 0;
                        } else {
                            numAudioTracks = offerOptions.offerToReceiveAudio;
                        }
                    }
                    if (offerOptions.offerToReceiveVideo !== undefined) {
                        if (offerOptions.offerToReceiveVideo === true) {
                            numVideoTracks = 1;
                        } else if (offerOptions.offerToReceiveVideo === false) {
                            numVideoTracks = 0;
                        } else {
                            numVideoTracks = offerOptions.offerToReceiveVideo;
                        }
                    }
                }

                this.transceivers.forEach(function(transceiver) {
                    if (transceiver.kind === 'audio') {
                        numAudioTracks--;
                        if (numAudioTracks < 0) {
                            transceiver.wantReceive = false;
                        }
                    } else if (transceiver.kind === 'video') {
                        numVideoTracks--;
                        if (numVideoTracks < 0) {
                            transceiver.wantReceive = false;
                        }
                    }
                });

                // Create M-lines for recvonly streams.
                while (numAudioTracks > 0 || numVideoTracks > 0) {
                    if (numAudioTracks > 0) {
                        this._createTransceiver('audio');
                        numAudioTracks--;
                    }
                    if (numVideoTracks > 0) {
                        this._createTransceiver('video');
                        numVideoTracks--;
                    }
                }

                var sdp = SDPUtils.writeSessionBoilerplate(this._sdpSessionId,
                    this._sdpSessionVersion++);
                this.transceivers.forEach(function(transceiver, sdpMLineIndex) {
                    // For each track, create an ice gatherer, ice transport,
                    // dtls transport, potentially rtpsender and rtpreceiver.
                    var track = transceiver.track;
                    var kind = transceiver.kind;
                    var mid = SDPUtils.generateIdentifier();
                    transceiver.mid = mid;

                    if (!transceiver.iceGatherer) {
                        transceiver.iceGatherer = self._createIceGatherer(sdpMLineIndex,
                            self.usingBundle);
                    }

                    var localCapabilities = window.RTCRtpSender.getCapabilities(kind);
                    // filter RTX until additional stuff needed for RTX is implemented
                    // in adapter.js
                    if (edgeVersion < 15019) {
                        localCapabilities.codecs = localCapabilities.codecs.filter(
                            function(codec) {
                                return codec.name !== 'rtx';
                            });
                    }
                    localCapabilities.codecs.forEach(function(codec) {
                        // work around https://bugs.chromium.org/p/webrtc/issues/detail?id=6552
                        // by adding level-asymmetry-allowed=1
                        if (codec.name === 'H264' &&
                            codec.parameters['level-asymmetry-allowed'] === undefined) {
                            codec.parameters['level-asymmetry-allowed'] = '1';
                        }
                    });

                    // generate an ssrc now, to be used later in rtpSender.send
                    var sendEncodingParameters = transceiver.sendEncodingParameters || [{
                        ssrc: (2 * sdpMLineIndex + 1) * 1001
                    }];
                    if (track) {
                        // add RTX
                        if (edgeVersion >= 15019 && kind === 'video' &&
                            !sendEncodingParameters[0].rtx) {
                            sendEncodingParameters[0].rtx = {
                                ssrc: sendEncodingParameters[0].ssrc + 1
                            };
                        }
                    }

                    if (transceiver.wantReceive) {
                        transceiver.rtpReceiver = new window.RTCRtpReceiver(
                            transceiver.dtlsTransport, kind);
                    }

                    transceiver.localCapabilities = localCapabilities;
                    transceiver.sendEncodingParameters = sendEncodingParameters;
                });

                // always offer BUNDLE and dispose on return if not supported.
                if (this._config.bundlePolicy !== 'max-compat') {
                    sdp += 'a=group:BUNDLE ' + this.transceivers.map(function(t) {
                        return t.mid;
                    }).join(' ') + '\r\n';
                }
                sdp += 'a=ice-options:trickle\r\n';

                this.transceivers.forEach(function(transceiver, sdpMLineIndex) {
                    sdp += writeMediaSection(transceiver, transceiver.localCapabilities,
                        'offer', transceiver.stream, self._dtlsRole);
                    sdp += 'a=rtcp-rsize\r\n';

                    if (transceiver.iceGatherer && self.iceGatheringState !== 'new' &&
                        (sdpMLineIndex === 0 || !self.usingBundle)) {
                        transceiver.iceGatherer.getLocalCandidates().forEach(function(cand) {
                            cand.component = 1;
                            sdp += 'a=' + SDPUtils.writeCandidate(cand) + '\r\n';
                        });

                        if (transceiver.iceGatherer.state === 'completed') {
                            sdp += 'a=end-of-candidates\r\n';
                        }
                    }
                });

                var desc = new window.RTCSessionDescription({
                    type: 'offer',
                    sdp: sdp
                });
                return new Promise(function(resolve) {
                    if (args.length > 0 && typeof args[0] === 'function') {
                        args[0].apply(null, [desc]);
                        resolve();
                        return;
                    }
                    resolve(desc);
                });
            };

            RTCPeerConnection.prototype.createAnswer = function() {
                var self = this;
                var args = arguments;

                var sdp = SDPUtils.writeSessionBoilerplate(this._sdpSessionId,
                    this._sdpSessionVersion++);
                if (this.usingBundle) {
                    sdp += 'a=group:BUNDLE ' + this.transceivers.map(function(t) {
                        return t.mid;
                    }).join(' ') + '\r\n';
                }
                var mediaSectionsInOffer = SDPUtils.splitSections(
                    this.remoteDescription.sdp).length - 1;
                this.transceivers.forEach(function(transceiver, sdpMLineIndex) {
                    if (sdpMLineIndex + 1 > mediaSectionsInOffer) {
                        return;
                    }
                    if (transceiver.isDatachannel) {
                        sdp += 'm=application 0 DTLS/SCTP 5000\r\n' +
                            'c=IN IP4 0.0.0.0\r\n' +
                            'a=mid:' + transceiver.mid + '\r\n';
                        return;
                    }

                    // FIXME: look at direction.
                    if (transceiver.stream) {
                        var localTrack;
                        if (transceiver.kind === 'audio') {
                            localTrack = transceiver.stream.getAudioTracks()[0];
                        } else if (transceiver.kind === 'video') {
                            localTrack = transceiver.stream.getVideoTracks()[0];
                        }
                        if (localTrack) {
                            // add RTX
                            if (edgeVersion >= 15019 && transceiver.kind === 'video' &&
                                !transceiver.sendEncodingParameters[0].rtx) {
                                transceiver.sendEncodingParameters[0].rtx = {
                                    ssrc: transceiver.sendEncodingParameters[0].ssrc + 1
                                };
                            }
                        }
                    }

                    // Calculate intersection of capabilities.
                    var commonCapabilities = getCommonCapabilities(
                        transceiver.localCapabilities,
                        transceiver.remoteCapabilities);

                    var hasRtx = commonCapabilities.codecs.filter(function(c) {
                        return c.name.toLowerCase() === 'rtx';
                    }).length;
                    if (!hasRtx && transceiver.sendEncodingParameters[0].rtx) {
                        delete transceiver.sendEncodingParameters[0].rtx;
                    }

                    sdp += writeMediaSection(transceiver, commonCapabilities,
                        'answer', transceiver.stream, self._dtlsRole);
                    if (transceiver.rtcpParameters &&
                        transceiver.rtcpParameters.reducedSize) {
                        sdp += 'a=rtcp-rsize\r\n';
                    }
                });

                var desc = new window.RTCSessionDescription({
                    type: 'answer',
                    sdp: sdp
                });
                return new Promise(function(resolve) {
                    if (args.length > 0 && typeof args[0] === 'function') {
                        args[0].apply(null, [desc]);
                        resolve();
                        return;
                    }
                    resolve(desc);
                });
            };

            RTCPeerConnection.prototype.addIceCandidate = function(candidate) {
                var err;
                var sections;
                if (!candidate || candidate.candidate === '') {
                    for (var j = 0; j < this.transceivers.length; j++) {
                        if (this.transceivers[j].isDatachannel) {
                            continue;
                        }
                        this.transceivers[j].iceTransport.addRemoteCandidate({});
                        sections = SDPUtils.splitSections(this.remoteDescription.sdp);
                        sections[j + 1] += 'a=end-of-candidates\r\n';
                        this.remoteDescription.sdp = sections.join('');
                        if (this.usingBundle) {
                            break;
                        }
                    }
                } else if (!(candidate.sdpMLineIndex !== undefined || candidate.sdpMid)) {
                    throw new TypeError('sdpMLineIndex or sdpMid required');
                } else if (!this.remoteDescription) {
                    err = new Error('Can not add ICE candidate without ' +
                        'a remote description');
                    err.name = 'InvalidStateError';
                } else {
                    var sdpMLineIndex = candidate.sdpMLineIndex;
                    if (candidate.sdpMid) {
                        for (var i = 0; i < this.transceivers.length; i++) {
                            if (this.transceivers[i].mid === candidate.sdpMid) {
                                sdpMLineIndex = i;
                                break;
                            }
                        }
                    }
                    var transceiver = this.transceivers[sdpMLineIndex];
                    if (transceiver) {
                        if (transceiver.isDatachannel) {
                            return Promise.resolve();
                        }
                        var cand = Object.keys(candidate.candidate).length > 0 ?
                            SDPUtils.parseCandidate(candidate.candidate) : {};
                        // Ignore Chrome's invalid candidates since Edge does not like them.
                        if (cand.protocol === 'tcp' && (cand.port === 0 || cand.port === 9)) {
                            return Promise.resolve();
                        }
                        // Ignore RTCP candidates, we assume RTCP-MUX.
                        if (cand.component && cand.component !== 1) {
                            return Promise.resolve();
                        }
                        // when using bundle, avoid adding candidates to the wrong
                        // ice transport. And avoid adding candidates added in the SDP.
                        if (sdpMLineIndex === 0 || (sdpMLineIndex > 0 &&
                            transceiver.iceTransport !== this.transceivers[0].iceTransport)) {
                            if (!maybeAddCandidate(transceiver.iceTransport, cand)) {
                                err = new Error('Can not add ICE candidate');
                                err.name = 'OperationError';
                            }
                        }

                        if (!err) {
                            // update the remoteDescription.
                            var candidateString = candidate.candidate.trim();
                            if (candidateString.indexOf('a=') === 0) {
                                candidateString = candidateString.substr(2);
                            }
                            sections = SDPUtils.splitSections(this.remoteDescription.sdp);
                            sections[sdpMLineIndex + 1] += 'a=' +
                                (cand.type ? candidateString : 'end-of-candidates')
                                + '\r\n';
                            this.remoteDescription.sdp = sections.join('');
                        }
                    } else {
                        err = new Error('Can not add ICE candidate');
                        err.name = 'OperationError';
                    }
                }
                var args = arguments;
                return new Promise(function(resolve, reject) {
                    if (err) {
                        if (args.length > 2 && typeof args[2] === 'function') {
                            args[2].apply(null, [err]);
                        }
                        reject(err);
                    } else {
                        if (args.length > 1 && typeof args[1] === 'function') {
                            args[1].apply(null);
                        }
                        resolve();
                    }
                });
            };

            RTCPeerConnection.prototype.getStats = function() {
                var promises = [];
                this.transceivers.forEach(function(transceiver) {
                    ['rtpSender', 'rtpReceiver', 'iceGatherer', 'iceTransport',
                        'dtlsTransport'].forEach(function(method) {
                        if (transceiver[method]) {
                            promises.push(transceiver[method].getStats());
                        }
                    });
                });
                var cb = arguments.length > 1 && typeof arguments[1] === 'function' &&
                    arguments[1];
                var fixStatsType = function(stat) {
                    return {
                        inboundrtp: 'inbound-rtp',
                        outboundrtp: 'outbound-rtp',
                        candidatepair: 'candidate-pair',
                        localcandidate: 'local-candidate',
                        remotecandidate: 'remote-candidate'
                    }[stat.type] || stat.type;
                };
                return new Promise(function(resolve) {
                    // shim getStats with maplike support
                    var results = new Map();
                    Promise.all(promises).then(function(res) {
                        res.forEach(function(result) {
                            Object.keys(result).forEach(function(id) {
                                result[id].type = fixStatsType(result[id]);
                                results.set(id, result[id]);
                            });
                        });
                        if (cb) {
                            cb.apply(null, results);
                        }
                        resolve(results);
                    });
                });
            };
            return RTCPeerConnection;
        };

    },{"sdp":2}],2:[function(require,module,exports){
        /* eslint-env node */
        'use strict';

// SDP helpers.
        var SDPUtils = {};

// Generate an alphanumeric identifier for cname or mids.
// TODO: use UUIDs instead? https://gist.github.com/jed/982883
        SDPUtils.generateIdentifier = function() {
            return Math.random().toString(36).substr(2, 10);
        };

// The RTCP CNAME used by all peerconnections from the same JS.
        SDPUtils.localCName = SDPUtils.generateIdentifier();

// Splits SDP into lines, dealing with both CRLF and LF.
        SDPUtils.splitLines = function(blob) {
            return blob.trim().split('\n').map(function(line) {
                return line.trim();
            });
        };
// Splits SDP into sessionpart and mediasections. Ensures CRLF.
        SDPUtils.splitSections = function(blob) {
            var parts = blob.split('\nm=');
            return parts.map(function(part, index) {
                return (index > 0 ? 'm=' + part : part).trim() + '\r\n';
            });
        };

// Returns lines that start with a certain prefix.
        SDPUtils.matchPrefix = function(blob, prefix) {
            return SDPUtils.splitLines(blob).filter(function(line) {
                return line.indexOf(prefix) === 0;
            });
        };

// Parses an ICE candidate line. Sample input:
// candidate:702786350 2 udp 41819902 8.8.8.8 60769 typ relay raddr 8.8.8.8
// rport 55996"
        SDPUtils.parseCandidate = function(line) {
            var parts;
            // Parse both variants.
            if (line.indexOf('a=candidate:') === 0) {
                parts = line.substring(12).split(' ');
            } else {
                parts = line.substring(10).split(' ');
            }

            var candidate = {
                foundation: parts[0],
                component: parseInt(parts[1], 10),
                protocol: parts[2].toLowerCase(),
                priority: parseInt(parts[3], 10),
                ip: parts[4],
                port: parseInt(parts[5], 10),
                // skip parts[6] == 'typ'
                type: parts[7]
            };

            for (var i = 8; i < parts.length; i += 2) {
                switch (parts[i]) {
                    case 'raddr':
                        candidate.relatedAddress = parts[i + 1];
                        break;
                    case 'rport':
                        candidate.relatedPort = parseInt(parts[i + 1], 10);
                        break;
                    case 'tcptype':
                        candidate.tcpType = parts[i + 1];
                        break;
                    case 'ufrag':
                        candidate.ufrag = parts[i + 1]; // for backward compability.
                        candidate.usernameFragment = parts[i + 1];
                        break;
                    default: // extension handling, in particular ufrag
                        candidate[parts[i]] = parts[i + 1];
                        break;
                }
            }
            return candidate;
        };

// Translates a candidate object into SDP candidate attribute.
        SDPUtils.writeCandidate = function(candidate) {
            var sdp = [];
            sdp.push(candidate.foundation);
            sdp.push(candidate.component);
            sdp.push(candidate.protocol.toUpperCase());
            sdp.push(candidate.priority);
            sdp.push(candidate.ip);
            sdp.push(candidate.port);

            var type = candidate.type;
            sdp.push('typ');
            sdp.push(type);
            if (type !== 'host' && candidate.relatedAddress &&
                candidate.relatedPort) {
                sdp.push('raddr');
                sdp.push(candidate.relatedAddress); // was: relAddr
                sdp.push('rport');
                sdp.push(candidate.relatedPort); // was: relPort
            }
            if (candidate.tcpType && candidate.protocol.toLowerCase() === 'tcp') {
                sdp.push('tcptype');
                sdp.push(candidate.tcpType);
            }
            if (candidate.ufrag) {
                sdp.push('ufrag');
                sdp.push(candidate.ufrag);
            }
            return 'candidate:' + sdp.join(' ');
        };

// Parses an ice-options line, returns an array of option tags.
// a=ice-options:foo bar
        SDPUtils.parseIceOptions = function(line) {
            return line.substr(14).split(' ');
        }

// Parses an rtpmap line, returns RTCRtpCoddecParameters. Sample input:
// a=rtpmap:111 opus/48000/2
        SDPUtils.parseRtpMap = function(line) {
            var parts = line.substr(9).split(' ');
            var parsed = {
                payloadType: parseInt(parts.shift(), 10) // was: id
            };

            parts = parts[0].split('/');

            parsed.name = parts[0];
            parsed.clockRate = parseInt(parts[1], 10); // was: clockrate
            // was: channels
            parsed.numChannels = parts.length === 3 ? parseInt(parts[2], 10) : 1;
            return parsed;
        };

// Generate an a=rtpmap line from RTCRtpCodecCapability or
// RTCRtpCodecParameters.
        SDPUtils.writeRtpMap = function(codec) {
            var pt = codec.payloadType;
            if (codec.preferredPayloadType !== undefined) {
                pt = codec.preferredPayloadType;
            }
            return 'a=rtpmap:' + pt + ' ' + codec.name + '/' + codec.clockRate +
                (codec.numChannels !== 1 ? '/' + codec.numChannels : '') + '\r\n';
        };

// Parses an a=extmap line (headerextension from RFC 5285). Sample input:
// a=extmap:2 urn:ietf:params:rtp-hdrext:toffset
// a=extmap:2/sendonly urn:ietf:params:rtp-hdrext:toffset
        SDPUtils.parseExtmap = function(line) {
            var parts = line.substr(9).split(' ');
            return {
                id: parseInt(parts[0], 10),
                direction: parts[0].indexOf('/') > 0 ? parts[0].split('/')[1] : 'sendrecv',
                uri: parts[1]
            };
        };

// Generates a=extmap line from RTCRtpHeaderExtensionParameters or
// RTCRtpHeaderExtension.
        SDPUtils.writeExtmap = function(headerExtension) {
            return 'a=extmap:' + (headerExtension.id || headerExtension.preferredId) +
                (headerExtension.direction && headerExtension.direction !== 'sendrecv'
                    ? '/' + headerExtension.direction
                    : '') +
                ' ' + headerExtension.uri + '\r\n';
        };

// Parses an ftmp line, returns dictionary. Sample input:
// a=fmtp:96 vbr=on;cng=on
// Also deals with vbr=on; cng=on
        SDPUtils.parseFmtp = function(line) {
            var parsed = {};
            var kv;
            var parts = line.substr(line.indexOf(' ') + 1).split(';');
            for (var j = 0; j < parts.length; j++) {
                kv = parts[j].trim().split('=');
                parsed[kv[0].trim()] = kv[1];
            }
            return parsed;
        };

// Generates an a=ftmp line from RTCRtpCodecCapability or RTCRtpCodecParameters.
        SDPUtils.writeFmtp = function(codec) {
            var line = '';
            var pt = codec.payloadType;
            if (codec.preferredPayloadType !== undefined) {
                pt = codec.preferredPayloadType;
            }
            if (codec.parameters && Object.keys(codec.parameters).length) {
                var params = [];
                Object.keys(codec.parameters).forEach(function(param) {
                    params.push(param + '=' + codec.parameters[param]);
                });
                line += 'a=fmtp:' + pt + ' ' + params.join(';') + '\r\n';
            }
            return line;
        };

// Parses an rtcp-fb line, returns RTCPRtcpFeedback object. Sample input:
// a=rtcp-fb:98 nack rpsi
        SDPUtils.parseRtcpFb = function(line) {
            var parts = line.substr(line.indexOf(' ') + 1).split(' ');
            return {
                type: parts.shift(),
                parameter: parts.join(' ')
            };
        };
// Generate a=rtcp-fb lines from RTCRtpCodecCapability or RTCRtpCodecParameters.
        SDPUtils.writeRtcpFb = function(codec) {
            var lines = '';
            var pt = codec.payloadType;
            if (codec.preferredPayloadType !== undefined) {
                pt = codec.preferredPayloadType;
            }
            if (codec.rtcpFeedback && codec.rtcpFeedback.length) {
                // FIXME: special handling for trr-int?
                codec.rtcpFeedback.forEach(function(fb) {
                    lines += 'a=rtcp-fb:' + pt + ' ' + fb.type +
                        (fb.parameter && fb.parameter.length ? ' ' + fb.parameter : '') +
                        '\r\n';
                });
            }
            return lines;
        };

// Parses an RFC 5576 ssrc media attribute. Sample input:
// a=ssrc:3735928559 cname:something
        SDPUtils.parseSsrcMedia = function(line) {
            var sp = line.indexOf(' ');
            var parts = {
                ssrc: parseInt(line.substr(7, sp - 7), 10)
            };
            var colon = line.indexOf(':', sp);
            if (colon > -1) {
                parts.attribute = line.substr(sp + 1, colon - sp - 1);
                parts.value = line.substr(colon + 1);
            } else {
                parts.attribute = line.substr(sp + 1);
            }
            return parts;
        };

// Extracts the MID (RFC 5888) from a media section.
// returns the MID or undefined if no mid line was found.
        SDPUtils.getMid = function(mediaSection) {
            var mid = SDPUtils.matchPrefix(mediaSection, 'a=mid:')[0];
            if (mid) {
                return mid.substr(6);
            }
        }

        SDPUtils.parseFingerprint = function(line) {
            var parts = line.substr(14).split(' ');
            return {
                algorithm: parts[0].toLowerCase(), // algorithm is case-sensitive in Edge.
                value: parts[1]
            };
        };

// Extracts DTLS parameters from SDP media section or sessionpart.
// FIXME: for consistency with other functions this should only
//   get the fingerprint line as input. See also getIceParameters.
        SDPUtils.getDtlsParameters = function(mediaSection, sessionpart) {
            var lines = SDPUtils.matchPrefix(mediaSection + sessionpart,
                'a=fingerprint:');
            // Note: a=setup line is ignored since we use the 'auto' role.
            // Note2: 'algorithm' is not case sensitive except in Edge.
            return {
                role: 'auto',
                fingerprints: lines.map(SDPUtils.parseFingerprint)
            };
        };

// Serializes DTLS parameters to SDP.
        SDPUtils.writeDtlsParameters = function(params, setupType) {
            var sdp = 'a=setup:' + setupType + '\r\n';
            params.fingerprints.forEach(function(fp) {
                sdp += 'a=fingerprint:' + fp.algorithm + ' ' + fp.value + '\r\n';
            });
            return sdp;
        };
// Parses ICE information from SDP media section or sessionpart.
// FIXME: for consistency with other functions this should only
//   get the ice-ufrag and ice-pwd lines as input.
        SDPUtils.getIceParameters = function(mediaSection, sessionpart) {
            var lines = SDPUtils.splitLines(mediaSection);
            // Search in session part, too.
            lines = lines.concat(SDPUtils.splitLines(sessionpart));
            var iceParameters = {
                usernameFragment: lines.filter(function(line) {
                    return line.indexOf('a=ice-ufrag:') === 0;
                })[0].substr(12),
                password: lines.filter(function(line) {
                    return line.indexOf('a=ice-pwd:') === 0;
                })[0].substr(10)
            };
            return iceParameters;
        };

// Serializes ICE parameters to SDP.
        SDPUtils.writeIceParameters = function(params) {
            return 'a=ice-ufrag:' + params.usernameFragment + '\r\n' +
                'a=ice-pwd:' + params.password + '\r\n';
        };

// Parses the SDP media section and returns RTCRtpParameters.
        SDPUtils.parseRtpParameters = function(mediaSection) {
            var description = {
                codecs: [],
                headerExtensions: [],
                fecMechanisms: [],
                rtcp: []
            };
            var lines = SDPUtils.splitLines(mediaSection);
            var mline = lines[0].split(' ');
            for (var i = 3; i < mline.length; i++) { // find all codecs from mline[3..]
                var pt = mline[i];
                var rtpmapline = SDPUtils.matchPrefix(
                    mediaSection, 'a=rtpmap:' + pt + ' ')[0];
                if (rtpmapline) {
                    var codec = SDPUtils.parseRtpMap(rtpmapline);
                    var fmtps = SDPUtils.matchPrefix(
                        mediaSection, 'a=fmtp:' + pt + ' ');
                    // Only the first a=fmtp:<pt> is considered.
                    codec.parameters = fmtps.length ? SDPUtils.parseFmtp(fmtps[0]) : {};
                    codec.rtcpFeedback = SDPUtils.matchPrefix(
                        mediaSection, 'a=rtcp-fb:' + pt + ' ')
                        .map(SDPUtils.parseRtcpFb);
                    description.codecs.push(codec);
                    // parse FEC mechanisms from rtpmap lines.
                    switch (codec.name.toUpperCase()) {
                        case 'RED':
                        case 'ULPFEC':
                            description.fecMechanisms.push(codec.name.toUpperCase());
                            break;
                        default: // only RED and ULPFEC are recognized as FEC mechanisms.
                            break;
                    }
                }
            }
            SDPUtils.matchPrefix(mediaSection, 'a=extmap:').forEach(function(line) {
                description.headerExtensions.push(SDPUtils.parseExtmap(line));
            });
            // FIXME: parse rtcp.
            return description;
        };

// Generates parts of the SDP media section describing the capabilities /
// parameters.
        SDPUtils.writeRtpDescription = function(kind, caps) {
            var sdp = '';

            // Build the mline.
            sdp += 'm=' + kind + ' ';
            sdp += caps.codecs.length > 0 ? '9' : '0'; // reject if no codecs.
            sdp += ' UDP/TLS/RTP/SAVPF ';
            sdp += caps.codecs.map(function(codec) {
                if (codec.preferredPayloadType !== undefined) {
                    return codec.preferredPayloadType;
                }
                return codec.payloadType;
            }).join(' ') + '\r\n';

            sdp += 'c=IN IP4 0.0.0.0\r\n';
            sdp += 'a=rtcp:9 IN IP4 0.0.0.0\r\n';

            // Add a=rtpmap lines for each codec. Also fmtp and rtcp-fb.
            caps.codecs.forEach(function(codec) {
                sdp += SDPUtils.writeRtpMap(codec);
                sdp += SDPUtils.writeFmtp(codec);
                sdp += SDPUtils.writeRtcpFb(codec);
            });
            var maxptime = 0;
            caps.codecs.forEach(function(codec) {
                if (codec.maxptime > maxptime) {
                    maxptime = codec.maxptime;
                }
            });
            if (maxptime > 0) {
                sdp += 'a=maxptime:' + maxptime + '\r\n';
            }
            sdp += 'a=rtcp-mux\r\n';

            caps.headerExtensions.forEach(function(extension) {
                sdp += SDPUtils.writeExtmap(extension);
            });
            // FIXME: write fecMechanisms.
            return sdp;
        };

// Parses the SDP media section and returns an array of
// RTCRtpEncodingParameters.
        SDPUtils.parseRtpEncodingParameters = function(mediaSection) {
            var encodingParameters = [];
            var description = SDPUtils.parseRtpParameters(mediaSection);
            var hasRed = description.fecMechanisms.indexOf('RED') !== -1;
            var hasUlpfec = description.fecMechanisms.indexOf('ULPFEC') !== -1;

            // filter a=ssrc:... cname:, ignore PlanB-msid
            var ssrcs = SDPUtils.matchPrefix(mediaSection, 'a=ssrc:')
                .map(function(line) {
                    return SDPUtils.parseSsrcMedia(line);
                })
                .filter(function(parts) {
                    return parts.attribute === 'cname';
                });
            var primarySsrc = ssrcs.length > 0 && ssrcs[0].ssrc;
            var secondarySsrc;

            var flows = SDPUtils.matchPrefix(mediaSection, 'a=ssrc-group:FID')
                .map(function(line) {
                    var parts = line.split(' ');
                    parts.shift();
                    return parts.map(function(part) {
                        return parseInt(part, 10);
                    });
                });
            if (flows.length > 0 && flows[0].length > 1 && flows[0][0] === primarySsrc) {
                secondarySsrc = flows[0][1];
            }

            description.codecs.forEach(function(codec) {
                if (codec.name.toUpperCase() === 'RTX' && codec.parameters.apt) {
                    var encParam = {
                        ssrc: primarySsrc,
                        codecPayloadType: parseInt(codec.parameters.apt, 10),
                        rtx: {
                            ssrc: secondarySsrc
                        }
                    };
                    encodingParameters.push(encParam);
                    if (hasRed) {
                        encParam = JSON.parse(JSON.stringify(encParam));
                        encParam.fec = {
                            ssrc: secondarySsrc,
                            mechanism: hasUlpfec ? 'red+ulpfec' : 'red'
                        };
                        encodingParameters.push(encParam);
                    }
                }
            });
            if (encodingParameters.length === 0 && primarySsrc) {
                encodingParameters.push({
                    ssrc: primarySsrc
                });
            }

            // we support both b=AS and b=TIAS but interpret AS as TIAS.
            var bandwidth = SDPUtils.matchPrefix(mediaSection, 'b=');
            if (bandwidth.length) {
                if (bandwidth[0].indexOf('b=TIAS:') === 0) {
                    bandwidth = parseInt(bandwidth[0].substr(7), 10);
                } else if (bandwidth[0].indexOf('b=AS:') === 0) {
                    // use formula from JSEP to convert b=AS to TIAS value.
                    bandwidth = parseInt(bandwidth[0].substr(5), 10) * 1000 * 0.95
                        - (50 * 40 * 8);
                } else {
                    bandwidth = undefined;
                }
                encodingParameters.forEach(function(params) {
                    params.maxBitrate = bandwidth;
                });
            }
            return encodingParameters;
        };

// parses http://draft.ortc.org/#rtcrtcpparameters*
        SDPUtils.parseRtcpParameters = function(mediaSection) {
            var rtcpParameters = {};

            var cname;
            // Gets the first SSRC. Note that with RTX there might be multiple
            // SSRCs.
            var remoteSsrc = SDPUtils.matchPrefix(mediaSection, 'a=ssrc:')
                .map(function(line) {
                    return SDPUtils.parseSsrcMedia(line);
                })
                .filter(function(obj) {
                    return obj.attribute === 'cname';
                })[0];
            if (remoteSsrc) {
                rtcpParameters.cname = remoteSsrc.value;
                rtcpParameters.ssrc = remoteSsrc.ssrc;
            }

            // Edge uses the compound attribute instead of reducedSize
            // compound is !reducedSize
            var rsize = SDPUtils.matchPrefix(mediaSection, 'a=rtcp-rsize');
            rtcpParameters.reducedSize = rsize.length > 0;
            rtcpParameters.compound = rsize.length === 0;

            // parses the rtcp-mux attrіbute.
            // Note that Edge does not support unmuxed RTCP.
            var mux = SDPUtils.matchPrefix(mediaSection, 'a=rtcp-mux');
            rtcpParameters.mux = mux.length > 0;

            return rtcpParameters;
        };

// parses either a=msid: or a=ssrc:... msid lines and returns
// the id of the MediaStream and MediaStreamTrack.
        SDPUtils.parseMsid = function(mediaSection) {
            var parts;
            var spec = SDPUtils.matchPrefix(mediaSection, 'a=msid:');
            if (spec.length === 1) {
                parts = spec[0].substr(7).split(' ');
                return {stream: parts[0], track: parts[1]};
            }
            var planB = SDPUtils.matchPrefix(mediaSection, 'a=ssrc:')
                .map(function(line) {
                    return SDPUtils.parseSsrcMedia(line);
                })
                .filter(function(parts) {
                    return parts.attribute === 'msid';
                });
            if (planB.length > 0) {
                parts = planB[0].value.split(' ');
                return {stream: parts[0], track: parts[1]};
            }
        };

// Generate a session ID for SDP.
// https://tools.ietf.org/html/draft-ietf-rtcweb-jsep-20#section-5.2.1
// recommends using a cryptographically random +ve 64-bit value
// but right now this should be acceptable and within the right range
        SDPUtils.generateSessionId = function() {
            return Math.random().toString().substr(2, 21);
        };

// Write boilder plate for start of SDP
// sessId argument is optional - if not supplied it will
// be generated randomly
// sessVersion is optional and defaults to 2
        SDPUtils.writeSessionBoilerplate = function(sessId, sessVer) {
            var sessionId;
            var version = sessVer !== undefined ? sessVer : 2;
            if (sessId) {
                sessionId = sessId;
            } else {
                sessionId = SDPUtils.generateSessionId();
            }
            // FIXME: sess-id should be an NTP timestamp.
            return 'v=0\r\n' +
                'o=thisisadapterortc ' + sessionId + ' ' + version + ' IN IP4 127.0.0.1\r\n' +
                's=-\r\n' +
                't=0 0\r\n';
        };

        SDPUtils.writeMediaSection = function(transceiver, caps, type, stream) {
            var sdp = SDPUtils.writeRtpDescription(transceiver.kind, caps);

            // Map ICE parameters (ufrag, pwd) to SDP.
            sdp += SDPUtils.writeIceParameters(
                transceiver.iceGatherer.getLocalParameters());

            // Map DTLS parameters to SDP.
            sdp += SDPUtils.writeDtlsParameters(
                transceiver.dtlsTransport.getLocalParameters(),
                type === 'offer' ? 'actpass' : 'active');

            sdp += 'a=mid:' + transceiver.mid + '\r\n';

            if (transceiver.direction) {
                sdp += 'a=' + transceiver.direction + '\r\n';
            } else if (transceiver.rtpSender && transceiver.rtpReceiver) {
                sdp += 'a=sendrecv\r\n';
            } else if (transceiver.rtpSender) {
                sdp += 'a=sendonly\r\n';
            } else if (transceiver.rtpReceiver) {
                sdp += 'a=recvonly\r\n';
            } else {
                sdp += 'a=inactive\r\n';
            }

            if (transceiver.rtpSender) {
                // spec.
                var msid = 'msid:' + stream.id + ' ' +
                    transceiver.rtpSender.track.id + '\r\n';
                sdp += 'a=' + msid;

                // for Chrome.
                sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].ssrc +
                    ' ' + msid;
                if (transceiver.sendEncodingParameters[0].rtx) {
                    sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].rtx.ssrc +
                        ' ' + msid;
                    sdp += 'a=ssrc-group:FID ' +
                        transceiver.sendEncodingParameters[0].ssrc + ' ' +
                        transceiver.sendEncodingParameters[0].rtx.ssrc +
                        '\r\n';
                }
            }
            // FIXME: this should be written by writeRtpDescription.
            sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].ssrc +
                ' cname:' + SDPUtils.localCName + '\r\n';
            if (transceiver.rtpSender && transceiver.sendEncodingParameters[0].rtx) {
                sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].rtx.ssrc +
                    ' cname:' + SDPUtils.localCName + '\r\n';
            }
            return sdp;
        };

// Gets the direction from the mediaSection or the sessionpart.
        SDPUtils.getDirection = function(mediaSection, sessionpart) {
            // Look for sendrecv, sendonly, recvonly, inactive, default to sendrecv.
            var lines = SDPUtils.splitLines(mediaSection);
            for (var i = 0; i < lines.length; i++) {
                switch (lines[i]) {
                    case 'a=sendrecv':
                    case 'a=sendonly':
                    case 'a=recvonly':
                    case 'a=inactive':
                        return lines[i].substr(2);
                    default:
                    // FIXME: What should happen here?
                }
            }
            if (sessionpart) {
                return SDPUtils.getDirection(sessionpart);
            }
            return 'sendrecv';
        };

        SDPUtils.getKind = function(mediaSection) {
            var lines = SDPUtils.splitLines(mediaSection);
            var mline = lines[0].split(' ');
            return mline[0].substr(2);
        };

        SDPUtils.isRejected = function(mediaSection) {
            return mediaSection.split(' ', 2)[1] === '0';
        };

        SDPUtils.parseMLine = function(mediaSection) {
            var lines = SDPUtils.splitLines(mediaSection);
            var mline = lines[0].split(' ');
            return {
                kind: mline[0].substr(2),
                port: parseInt(mline[1], 10),
                protocol: mline[2],
                fmt: mline.slice(3).join(' ')
            };
        };

// Expose public methods.
        if (typeof module === 'object') {
            module.exports = SDPUtils;
        }

    },{}],3:[function(require,module,exports){
        (function (global){
            /*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
            /* eslint-env node */

            'use strict';

            var adapterFactory = require('./adapter_factory.js');
            module.exports = adapterFactory({window: global.window});

        }).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
    },{"./adapter_factory.js":4}],4:[function(require,module,exports){
        /*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
        /* eslint-env node */

        'use strict';

        var utils = require('./utils');
// Shimming starts here.
        module.exports = function(dependencies, opts) {
            var window = dependencies && dependencies.window;

            var options = {
                shimChrome: true,
                shimFirefox: true,
                shimEdge: true,
                shimSafari: true,
            };

            for (var key in opts) {
                if (hasOwnProperty.call(opts, key)) {
                    options[key] = opts[key];
                }
            }

            // Utils.
            var logging = utils.log;
            var browserDetails = utils.detectBrowser(window);

            // Export to the adapter global object visible in the browser.
            var adapter = {
                browserDetails: browserDetails,
                extractVersion: utils.extractVersion,
                disableLog: utils.disableLog,
                disableWarnings: utils.disableWarnings
            };

            // Uncomment the line below if you want logging to occur, including logging
            // for the switch statement below. Can also be turned on in the browser via
            // adapter.disableLog(false), but then logging from the switch statement below
            // will not appear.
            // require('./utils').disableLog(false);

            // Browser shims.
            var chromeShim = require('./chrome/chrome_shim') || null;
            var edgeShim = require('./edge/edge_shim') || null;
            var firefoxShim = require('./firefox/firefox_shim') || null;
            var safariShim = require('./safari/safari_shim') || null;
            var commonShim = require('./common_shim') || null;

            // Shim browser if found.
            switch (browserDetails.browser) {
                case 'chrome':
                    if (!chromeShim || !chromeShim.shimPeerConnection ||
                        !options.shimChrome) {
                        logging('Chrome shim is not included in this adapter release.');
                        return adapter;
                    }
                    logging('adapter.js shimming chrome.');
                    // Export to the adapter global object visible in the browser.
                    adapter.browserShim = chromeShim;
                    commonShim.shimCreateObjectURL(window);

                    chromeShim.shimGetUserMedia(window);
                    chromeShim.shimMediaStream(window);
                    chromeShim.shimSourceObject(window);
                    chromeShim.shimPeerConnection(window);
                    chromeShim.shimOnTrack(window);
                    chromeShim.shimAddTrackRemoveTrack(window);
                    chromeShim.shimGetSendersWithDtmf(window);

                    commonShim.shimRTCIceCandidate(window);
                    break;
                case 'firefox':
                    if (!firefoxShim || !firefoxShim.shimPeerConnection ||
                        !options.shimFirefox) {
                        logging('Firefox shim is not included in this adapter release.');
                        return adapter;
                    }
                    logging('adapter.js shimming firefox.');
                    // Export to the adapter global object visible in the browser.
                    adapter.browserShim = firefoxShim;
                    commonShim.shimCreateObjectURL(window);

                    firefoxShim.shimGetUserMedia(window);
                    firefoxShim.shimSourceObject(window);
                    firefoxShim.shimPeerConnection(window);
                    firefoxShim.shimOnTrack(window);
                    firefoxShim.shimRemoveStream(window);

                    commonShim.shimRTCIceCandidate(window);
                    break;
                case 'edge':
                    if (!edgeShim || !edgeShim.shimPeerConnection || !options.shimEdge) {
                        logging('MS edge shim is not included in this adapter release.');
                        return adapter;
                    }
                    logging('adapter.js shimming edge.');
                    // Export to the adapter global object visible in the browser.
                    adapter.browserShim = edgeShim;
                    commonShim.shimCreateObjectURL(window);

                    edgeShim.shimGetUserMedia(window);
                    edgeShim.shimPeerConnection(window);
                    edgeShim.shimReplaceTrack(window);

                    // the edge shim implements the full RTCIceCandidate object.
                    break;
                case 'safari':
                    if (!safariShim || !options.shimSafari) {
                        logging('Safari shim is not included in this adapter release.');
                        return adapter;
                    }
                    logging('adapter.js shimming safari.');
                    // Export to the adapter global object visible in the browser.
                    adapter.browserShim = safariShim;
                    commonShim.shimCreateObjectURL(window);

                    safariShim.shimRTCIceServerUrls(window);
                    safariShim.shimCallbacksAPI(window);
                    safariShim.shimLocalStreamsAPI(window);
                    safariShim.shimRemoteStreamsAPI(window);
                    safariShim.shimTrackEventTransceiver(window);
                    safariShim.shimGetUserMedia(window);
                    safariShim.shimCreateOfferLegacy(window);

                    commonShim.shimRTCIceCandidate(window);
                    break;
                default:
                    logging('Unsupported browser!');
                    break;
            }

            return adapter;
        };

    },{"./chrome/chrome_shim":5,"./common_shim":7,"./edge/edge_shim":8,"./firefox/firefox_shim":10,"./safari/safari_shim":12,"./utils":13}],5:[function(require,module,exports){

        /*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
        /* eslint-env node */
        'use strict';
        var utils = require('../utils.js');
        var logging = utils.log;

        var chromeShim = {
            shimMediaStream: function(window) {
                window.MediaStream = window.MediaStream || window.webkitMediaStream;
            },

            shimOnTrack: function(window) {
                if (typeof window === 'object' && window.RTCPeerConnection && !('ontrack' in
                    window.RTCPeerConnection.prototype)) {
                    Object.defineProperty(window.RTCPeerConnection.prototype, 'ontrack', {
                        get: function() {
                            return this._ontrack;
                        },
                        set: function(f) {
                            if (this._ontrack) {
                                this.removeEventListener('track', this._ontrack);
                            }
                            this.addEventListener('track', this._ontrack = f);
                        }
                    });
                    var origSetRemoteDescription =
                        window.RTCPeerConnection.prototype.setRemoteDescription;
                    window.RTCPeerConnection.prototype.setRemoteDescription = function() {
                        var pc = this;
                        if (!pc._ontrackpoly) {
                            pc._ontrackpoly = function(e) {
                                // onaddstream does not fire when a track is added to an existing
                                // stream. But stream.onaddtrack is implemented so we use that.
                                e.stream.addEventListener('addtrack', function(te) {
                                    var receiver;
                                    if (window.RTCPeerConnection.prototype.getReceivers) {
                                        receiver = pc.getReceivers().find(function(r) {
                                            return r.track && r.track.id === te.track.id;
                                        });
                                    } else {
                                        receiver = {track: te.track};
                                    }

                                    var event = new Event('track');
                                    event.track = te.track;
                                    event.receiver = receiver;
                                    event.transceiver = {receiver: receiver};
                                    event.streams = [e.stream];
                                    pc.dispatchEvent(event);
                                });
                                e.stream.getTracks().forEach(function(track) {
                                    var receiver;
                                    if (window.RTCPeerConnection.prototype.getReceivers) {
                                        receiver = pc.getReceivers().find(function(r) {
                                            return r.track && r.track.id === track.id;
                                        });
                                    } else {
                                        receiver = {track: track};
                                    }
                                    var event = new Event('track');
                                    event.track = track;
                                    event.receiver = receiver;
                                    event.transceiver = {receiver: receiver};
                                    event.streams = [e.stream];
                                    pc.dispatchEvent(event);
                                });
                            };
                            pc.addEventListener('addstream', pc._ontrackpoly);
                        }
                        return origSetRemoteDescription.apply(pc, arguments);
                    };
                }
            },

            shimGetSendersWithDtmf: function(window) {
                // Overrides addTrack/removeTrack, depends on shimAddTrackRemoveTrack.
                if (typeof window === 'object' && window.RTCPeerConnection &&
                    !('getSenders' in window.RTCPeerConnection.prototype) &&
                    'createDTMFSender' in window.RTCPeerConnection.prototype) {
                    var shimSenderWithDtmf = function(pc, track) {
                        return {
                            track: track,
                            get dtmf() {
                                if (this._dtmf === undefined) {
                                    if (track.kind === 'audio') {
                                        this._dtmf = pc.createDTMFSender(track);
                                    } else {
                                        this._dtmf = null;
                                    }
                                }
                                return this._dtmf;
                            },
                            _pc: pc
                        };
                    };

                    // augment addTrack when getSenders is not available.
                    if (!window.RTCPeerConnection.prototype.getSenders) {
                        window.RTCPeerConnection.prototype.getSenders = function() {
                            this._senders = this._senders || [];
                            return this._senders.slice(); // return a copy of the internal state.
                        };
                        var origAddTrack = window.RTCPeerConnection.prototype.addTrack;
                        window.RTCPeerConnection.prototype.addTrack = function(track, stream) {
                            var pc = this;
                            var sender = origAddTrack.apply(pc, arguments);
                            if (!sender) {
                                sender = shimSenderWithDtmf(pc, track);
                                pc._senders.push(sender);
                            }
                            return sender;
                        };

                        var origRemoveTrack = window.RTCPeerConnection.prototype.removeTrack;
                        window.RTCPeerConnection.prototype.removeTrack = function(sender) {
                            var pc = this;
                            origRemoveTrack.apply(pc, arguments);
                            var idx = pc._senders.indexOf(sender);
                            if (idx !== -1) {
                                pc._senders.splice(idx, 1);
                            }
                        };
                    }
                    var origAddStream = window.RTCPeerConnection.prototype.addStream;
                    window.RTCPeerConnection.prototype.addStream = function(stream) {
                        var pc = this;
                        pc._senders = pc._senders || [];
                        origAddStream.apply(pc, [stream]);
                        stream.getTracks().forEach(function(track) {
                            pc._senders.push(shimSenderWithDtmf(pc, track));
                        });
                    };

                    var origRemoveStream = window.RTCPeerConnection.prototype.removeStream;
                    window.RTCPeerConnection.prototype.removeStream = function(stream) {
                        var pc = this;
                        pc._senders = pc._senders || [];
                        origRemoveStream.apply(pc, [stream]);

                        stream.getTracks().forEach(function(track) {
                            var sender = pc._senders.find(function(s) {
                                return s.track === track;
                            });
                            if (sender) {
                                pc._senders.splice(pc._senders.indexOf(sender), 1); // remove sender
                            }
                        });
                    };
                } else if (typeof window === 'object' && window.RTCPeerConnection &&
                    'getSenders' in window.RTCPeerConnection.prototype &&
                    'createDTMFSender' in window.RTCPeerConnection.prototype &&
                    window.RTCRtpSender &&
                    !('dtmf' in window.RTCRtpSender.prototype)) {
                    var origGetSenders = window.RTCPeerConnection.prototype.getSenders;
                    window.RTCPeerConnection.prototype.getSenders = function() {
                        var pc = this;
                        var senders = origGetSenders.apply(pc, []);
                        senders.forEach(function(sender) {
                            sender._pc = pc;
                        });
                        return senders;
                    };

                    Object.defineProperty(window.RTCRtpSender.prototype, 'dtmf', {
                        get: function() {
                            if (this._dtmf === undefined) {
                                if (this.track.kind === 'audio') {
                                    this._dtmf = this._pc.createDTMFSender(this.track);
                                } else {
                                    this._dtmf = null;
                                }
                            }
                            return this._dtmf;
                        }
                    });
                }
            },

            shimSourceObject: function(window) {
                var URL = window && window.URL;

                if (typeof window === 'object') {
                    if (window.HTMLMediaElement &&
                        !('srcObject' in window.HTMLMediaElement.prototype)) {
                        // Shim the srcObject property, once, when HTMLMediaElement is found.
                        Object.defineProperty(window.HTMLMediaElement.prototype, 'srcObject', {
                            get: function() {
                                return this._srcObject;
                            },
                            set: function(stream) {
                                var self = this;
                                // Use _srcObject as a private property for this shim
                                this._srcObject = stream;
                                if (this.src) {
                                    URL.revokeObjectURL(this.src);
                                }

                                if (!stream) {
                                    this.src = '';
                                    return undefined;
                                }
                                this.src = URL.createObjectURL(stream);
                                // We need to recreate the blob url when a track is added or
                                // removed. Doing it manually since we want to avoid a recursion.
                                stream.addEventListener('addtrack', function() {
                                    if (self.src) {
                                        URL.revokeObjectURL(self.src);
                                    }
                                    self.src = URL.createObjectURL(stream);
                                });
                                stream.addEventListener('removetrack', function() {
                                    if (self.src) {
                                        URL.revokeObjectURL(self.src);
                                    }
                                    self.src = URL.createObjectURL(stream);
                                });
                            }
                        });
                    }
                }
            },

            shimAddTrackRemoveTrack: function(window) {
                var browserDetails = utils.detectBrowser(window);
                // shim addTrack and removeTrack.
                if (window.RTCPeerConnection.prototype.addTrack &&
                    browserDetails.version >= 64) {
                    return;
                }

                // also shim pc.getLocalStreams when addTrack is shimmed
                // to return the original streams.
                var origGetLocalStreams = window.RTCPeerConnection.prototype
                    .getLocalStreams;
                window.RTCPeerConnection.prototype.getLocalStreams = function() {
                    var self = this;
                    var nativeStreams = origGetLocalStreams.apply(this);
                    self._reverseStreams = self._reverseStreams || {};
                    return nativeStreams.map(function(stream) {
                        return self._reverseStreams[stream.id];
                    });
                };

                var origAddStream = window.RTCPeerConnection.prototype.addStream;
                window.RTCPeerConnection.prototype.addStream = function(stream) {
                    var pc = this;
                    pc._streams = pc._streams || {};
                    pc._reverseStreams = pc._reverseStreams || {};

                    stream.getTracks().forEach(function(track) {
                        var alreadyExists = pc.getSenders().find(function(s) {
                            return s.track === track;
                        });
                        if (alreadyExists) {
                            throw new DOMException('Track already exists.',
                                'InvalidAccessError');
                        }
                    });
                    // Add identity mapping for consistency with addTrack.
                    // Unless this is being used with a stream from addTrack.
                    if (!pc._reverseStreams[stream.id]) {
                        var newStream = new window.MediaStream(stream.getTracks());
                        pc._streams[stream.id] = newStream;
                        pc._reverseStreams[newStream.id] = stream;
                        stream = newStream;
                    }
                    origAddStream.apply(pc, [stream]);
                };

                var origRemoveStream = window.RTCPeerConnection.prototype.removeStream;
                window.RTCPeerConnection.prototype.removeStream = function(stream) {
                    var pc = this;
                    pc._streams = pc._streams || {};
                    pc._reverseStreams = pc._reverseStreams || {};

                    origRemoveStream.apply(pc, [(pc._streams[stream.id] || stream)]);
                    delete pc._reverseStreams[(pc._streams[stream.id] ?
                        pc._streams[stream.id].id : stream.id)];
                    delete pc._streams[stream.id];
                };

                window.RTCPeerConnection.prototype.addTrack = function(track, stream) {
                    var pc = this;
                    if (pc.signalingState === 'closed') {
                        throw new DOMException(
                            'The RTCPeerConnection\'s signalingState is \'closed\'.',
                            'InvalidStateError');
                    }
                    var streams = [].slice.call(arguments, 1);
                    if (streams.length !== 1 ||
                        !streams[0].getTracks().find(function(t) {
                            return t === track;
                        })) {
                        // this is not fully correct but all we can manage without
                        // [[associated MediaStreams]] internal slot.
                        throw new DOMException(
                            'The adapter.js addTrack polyfill only supports a single ' +
                            ' stream which is associated with the specified track.',
                            'NotSupportedError');
                    }

                    var alreadyExists = pc.getSenders().find(function(s) {
                        return s.track === track;
                    });
                    if (alreadyExists) {
                        throw new DOMException('Track already exists.',
                            'InvalidAccessError');
                    }

                    pc._streams = pc._streams || {};
                    pc._reverseStreams = pc._reverseStreams || {};
                    var oldStream = pc._streams[stream.id];
                    if (oldStream) {
                        // this is using odd Chrome behaviour, use with caution:
                        // https://bugs.chromium.org/p/webrtc/issues/detail?id=7815
                        // Note: we rely on the high-level addTrack/dtmf shim to
                        // create the sender with a dtmf sender.
                        oldStream.addTrack(track);

                        // Trigger ONN async.
                        Promise.resolve().then(function() {
                            pc.dispatchEvent(new Event('negotiationneeded'));
                        });
                    } else {
                        var newStream = new window.MediaStream([track]);
                        pc._streams[stream.id] = newStream;
                        pc._reverseStreams[newStream.id] = stream;
                        pc.addStream(newStream);
                    }
                    return pc.getSenders().find(function(s) {
                        return s.track === track;
                    });
                };

                // replace the internal stream id with the external one and
                // vice versa.
                function replaceInternalStreamId(pc, description) {
                    var sdp = description.sdp;
                    Object.keys(pc._reverseStreams || []).forEach(function(internalId) {
                        var externalStream = pc._reverseStreams[internalId];
                        var internalStream = pc._streams[externalStream.id];
                        sdp = sdp.replace(new RegExp(internalStream.id, 'g'),
                            externalStream.id);
                    });
                    return new RTCSessionDescription({
                        type: description.type,
                        sdp: sdp
                    });
                }
                function replaceExternalStreamId(pc, description) {
                    var sdp = description.sdp;
                    Object.keys(pc._reverseStreams || []).forEach(function(internalId) {
                        var externalStream = pc._reverseStreams[internalId];
                        var internalStream = pc._streams[externalStream.id];
                        sdp = sdp.replace(new RegExp(externalStream.id, 'g'),
                            internalStream.id);
                    });
                    return new RTCSessionDescription({
                        type: description.type,
                        sdp: sdp
                    });
                }
                ['createOffer', 'createAnswer'].forEach(function(method) {
                    var nativeMethod = window.RTCPeerConnection.prototype[method];
                    window.RTCPeerConnection.prototype[method] = function() {
                        var pc = this;
                        var args = arguments;
                        var isLegacyCall = arguments.length &&
                            typeof arguments[0] === 'function';
                        if (isLegacyCall) {
                            return nativeMethod.apply(pc, [
                                function(description) {
                                    var desc = replaceInternalStreamId(pc, description);
                                    args[0].apply(null, [desc]);
                                },
                                function(err) {
                                    if (args[1]) {
                                        args[1].apply(null, err);
                                    }
                                }, arguments[2]
                            ]);
                        }
                        return nativeMethod.apply(pc, arguments)
                            .then(function(description) {
                                return replaceInternalStreamId(pc, description);
                            });
                    };
                });

                var origSetLocalDescription =
                    window.RTCPeerConnection.prototype.setLocalDescription;
                window.RTCPeerConnection.prototype.setLocalDescription = function() {
                    var pc = this;
                    if (!arguments.length || !arguments[0].type) {
                        return origSetLocalDescription.apply(pc, arguments);
                    }
                    arguments[0] = replaceExternalStreamId(pc, arguments[0]);
                    return origSetLocalDescription.apply(pc, arguments);
                };

                // TODO: mangle getStats: https://w3c.github.io/webrtc-stats/#dom-rtcmediastreamstats-streamidentifier

                var origLocalDescription = Object.getOwnPropertyDescriptor(
                    window.RTCPeerConnection.prototype, 'localDescription');
                Object.defineProperty(window.RTCPeerConnection.prototype,
                    'localDescription', {
                        get: function() {
                            var pc = this;
                            var description = origLocalDescription.get.apply(this);
                            if (description.type === '') {
                                return description;
                            }
                            return replaceInternalStreamId(pc, description);
                        }
                    });

                window.RTCPeerConnection.prototype.removeTrack = function(sender) {
                    var pc = this;
                    if (pc.signalingState === 'closed') {
                        throw new DOMException(
                            'The RTCPeerConnection\'s signalingState is \'closed\'.',
                            'InvalidStateError');
                    }
                    // We can not yet check for sender instanceof RTCRtpSender
                    // since we shim RTPSender. So we check if sender._pc is set.
                    if (!sender._pc) {
                        throw new DOMException('Argument 1 of RTCPeerConnection.removeTrack ' +
                            'does not implement interface RTCRtpSender.', 'TypeError');
                    }
                    var isLocal = sender._pc === pc;
                    if (!isLocal) {
                        throw new DOMException('Sender was not created by this connection.',
                            'InvalidAccessError');
                    }

                    // Search for the native stream the senders track belongs to.
                    pc._streams = pc._streams || {};
                    var stream;
                    Object.keys(pc._streams).forEach(function(streamid) {
                        var hasTrack = pc._streams[streamid].getTracks().find(function(track) {
                            return sender.track === track;
                        });
                        if (hasTrack) {
                            stream = pc._streams[streamid];
                        }
                    });

                    if (stream) {
                        if (stream.getTracks().length === 1) {
                            // if this is the last track of the stream, remove the stream. This
                            // takes care of any shimmed _senders.
                            pc.removeStream(pc._reverseStreams[stream.id]);
                        } else {
                            // relying on the same odd chrome behaviour as above.
                            stream.removeTrack(sender.track);
                        }
                        pc.dispatchEvent(new Event('negotiationneeded'));
                    }
                };
            },

            shimPeerConnection: function(window) {
                var browserDetails = utils.detectBrowser(window);

                // The RTCPeerConnection object.
                if (!window.RTCPeerConnection) {
                    window.RTCPeerConnection = function(pcConfig, pcConstraints) {
                        // Translate iceTransportPolicy to iceTransports,
                        // see https://code.google.com/p/webrtc/issues/detail?id=4869
                        // this was fixed in M56 along with unprefixing RTCPeerConnection.
                        logging('PeerConnection');
                        if (pcConfig && pcConfig.iceTransportPolicy) {
                            pcConfig.iceTransports = pcConfig.iceTransportPolicy;
                        }

                        return new window.webkitRTCPeerConnection(pcConfig, pcConstraints);
                    };
                    window.RTCPeerConnection.prototype =
                        window.webkitRTCPeerConnection.prototype;
                    // wrap static methods. Currently just generateCertificate.
                    if (window.webkitRTCPeerConnection.generateCertificate) {
                        Object.defineProperty(window.RTCPeerConnection, 'generateCertificate', {
                            get: function() {
                                return window.webkitRTCPeerConnection.generateCertificate;
                            }
                        });
                    }
                } else {
                    // migrate from non-spec RTCIceServer.url to RTCIceServer.urls
                    var OrigPeerConnection = window.RTCPeerConnection;
                    window.RTCPeerConnection = function(pcConfig, pcConstraints) {
                        if (pcConfig && pcConfig.iceServers) {
                            var newIceServers = [];
                            for (var i = 0; i < pcConfig.iceServers.length; i++) {
                                var server = pcConfig.iceServers[i];
                                if (!server.hasOwnProperty('urls') &&
                                    server.hasOwnProperty('url')) {
                                    utils.deprecated('RTCIceServer.url', 'RTCIceServer.urls');
                                    server = JSON.parse(JSON.stringify(server));
                                    server.urls = server.url;
                                    newIceServers.push(server);
                                } else {
                                    newIceServers.push(pcConfig.iceServers[i]);
                                }
                            }
                            pcConfig.iceServers = newIceServers;
                        }
                        return new OrigPeerConnection(pcConfig, pcConstraints);
                    };
                    window.RTCPeerConnection.prototype = OrigPeerConnection.prototype;
                    // wrap static methods. Currently just generateCertificate.
                    Object.defineProperty(window.RTCPeerConnection, 'generateCertificate', {
                        get: function() {
                            return OrigPeerConnection.generateCertificate;
                        }
                    });
                }

                var origGetStats = window.RTCPeerConnection.prototype.getStats;
                window.RTCPeerConnection.prototype.getStats = function(selector,
                                                                       successCallback, errorCallback) {
                    var self = this;
                    var args = arguments;

                    // If selector is a function then we are in the old style stats so just
                    // pass back the original getStats format to avoid breaking old users.
                    if (arguments.length > 0 && typeof selector === 'function') {
                        return origGetStats.apply(this, arguments);
                    }

                    // When spec-style getStats is supported, return those when called with
                    // either no arguments or the selector argument is null.
                    if (origGetStats.length === 0 && (arguments.length === 0 ||
                        typeof arguments[0] !== 'function')) {
                        return origGetStats.apply(this, []);
                    }

                    var fixChromeStats_ = function(response) {
                        var standardReport = {};
                        var reports = response.result();
                        reports.forEach(function(report) {
                            var standardStats = {
                                id: report.id,
                                timestamp: report.timestamp,
                                type: {
                                    localcandidate: 'local-candidate',
                                    remotecandidate: 'remote-candidate'
                                }[report.type] || report.type
                            };
                            report.names().forEach(function(name) {
                                standardStats[name] = report.stat(name);
                            });
                            standardReport[standardStats.id] = standardStats;
                        });

                        return standardReport;
                    };

                    // shim getStats with maplike support
                    var makeMapStats = function(stats) {
                        return new Map(Object.keys(stats).map(function(key) {
                            return [key, stats[key]];
                        }));
                    };

                    if (arguments.length >= 2) {
                        var successCallbackWrapper_ = function(response) {
                            args[1](makeMapStats(fixChromeStats_(response)));
                        };

                        return origGetStats.apply(this, [successCallbackWrapper_,
                            arguments[0]]);
                    }

                    // promise-support
                    return new Promise(function(resolve, reject) {
                        origGetStats.apply(self, [
                            function(response) {
                                resolve(makeMapStats(fixChromeStats_(response)));
                            }, reject]);
                    }).then(successCallback, errorCallback);
                };

                // add promise support -- natively available in Chrome 51
                if (browserDetails.version < 51) {
                    ['setLocalDescription', 'setRemoteDescription', 'addIceCandidate']
                        .forEach(function(method) {
                            var nativeMethod = window.RTCPeerConnection.prototype[method];
                            window.RTCPeerConnection.prototype[method] = function() {
                                var args = arguments;
                                var self = this;
                                var promise = new Promise(function(resolve, reject) {
                                    nativeMethod.apply(self, [args[0], resolve, reject]);
                                });
                                if (args.length < 2) {
                                    return promise;
                                }
                                return promise.then(function() {
                                        args[1].apply(null, []);
                                    },
                                    function(err) {
                                        if (args.length >= 3) {
                                            args[2].apply(null, [err]);
                                        }
                                    });
                            };
                        });
                }

                // promise support for createOffer and createAnswer. Available (without
                // bugs) since M52: crbug/619289
                if (browserDetails.version < 52) {
                    ['createOffer', 'createAnswer'].forEach(function(method) {
                        var nativeMethod = window.RTCPeerConnection.prototype[method];
                        window.RTCPeerConnection.prototype[method] = function() {
                            var self = this;
                            if (arguments.length < 1 || (arguments.length === 1 &&
                                typeof arguments[0] === 'object')) {
                                var opts = arguments.length === 1 ? arguments[0] : undefined;
                                return new Promise(function(resolve, reject) {
                                    nativeMethod.apply(self, [resolve, reject, opts]);
                                });
                            }
                            return nativeMethod.apply(this, arguments);
                        };
                    });
                }

                // shim implicit creation of RTCSessionDescription/RTCIceCandidate
                ['setLocalDescription', 'setRemoteDescription', 'addIceCandidate']
                    .forEach(function(method) {
                        var nativeMethod = window.RTCPeerConnection.prototype[method];
                        window.RTCPeerConnection.prototype[method] = function() {
                            arguments[0] = new ((method === 'addIceCandidate') ?
                                window.RTCIceCandidate :
                                window.RTCSessionDescription)(arguments[0]);
                            return nativeMethod.apply(this, arguments);
                        };
                    });

                // support for addIceCandidate(null or undefined)
                var nativeAddIceCandidate =
                    window.RTCPeerConnection.prototype.addIceCandidate;
                window.RTCPeerConnection.prototype.addIceCandidate = function() {
                    if (!arguments[0]) {
                        if (arguments[1]) {
                            arguments[1].apply(null);
                        }
                        return Promise.resolve();
                    }
                    return nativeAddIceCandidate.apply(this, arguments);
                };
            }
        };


// Expose public methods.
        module.exports = {
            shimMediaStream: chromeShim.shimMediaStream,
            shimOnTrack: chromeShim.shimOnTrack,
            shimAddTrackRemoveTrack: chromeShim.shimAddTrackRemoveTrack,
            shimGetSendersWithDtmf: chromeShim.shimGetSendersWithDtmf,
            shimSourceObject: chromeShim.shimSourceObject,
            shimPeerConnection: chromeShim.shimPeerConnection,
            shimGetUserMedia: require('./getusermedia')
        };

    },{"../utils.js":13,"./getusermedia":6}],6:[function(require,module,exports){
        /*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
        /* eslint-env node */
        'use strict';
        var utils = require('../utils.js');
        var logging = utils.log;

// Expose public methods.
        module.exports = function(window) {
            var browserDetails = utils.detectBrowser(window);
            var navigator = window && window.navigator;

            var constraintsToChrome_ = function(c) {
                if (typeof c !== 'object' || c.mandatory || c.optional) {
                    return c;
                }
                var cc = {};
                Object.keys(c).forEach(function(key) {
                    if (key === 'require' || key === 'advanced' || key === 'mediaSource') {
                        return;
                    }
                    var r = (typeof c[key] === 'object') ? c[key] : {ideal: c[key]};
                    if (r.exact !== undefined && typeof r.exact === 'number') {
                        r.min = r.max = r.exact;
                    }
                    var oldname_ = function(prefix, name) {
                        if (prefix) {
                            return prefix + name.charAt(0).toUpperCase() + name.slice(1);
                        }
                        return (name === 'deviceId') ? 'sourceId' : name;
                    };
                    if (r.ideal !== undefined) {
                        cc.optional = cc.optional || [];
                        var oc = {};
                        if (typeof r.ideal === 'number') {
                            oc[oldname_('min', key)] = r.ideal;
                            cc.optional.push(oc);
                            oc = {};
                            oc[oldname_('max', key)] = r.ideal;
                            cc.optional.push(oc);
                        } else {
                            oc[oldname_('', key)] = r.ideal;
                            cc.optional.push(oc);
                        }
                    }
                    if (r.exact !== undefined && typeof r.exact !== 'number') {
                        cc.mandatory = cc.mandatory || {};
                        cc.mandatory[oldname_('', key)] = r.exact;
                    } else {
                        ['min', 'max'].forEach(function(mix) {
                            if (r[mix] !== undefined) {
                                cc.mandatory = cc.mandatory || {};
                                cc.mandatory[oldname_(mix, key)] = r[mix];
                            }
                        });
                    }
                });
                if (c.advanced) {
                    cc.optional = (cc.optional || []).concat(c.advanced);
                }
                return cc;
            };

            var shimConstraints_ = function(constraints, func) {
                if (browserDetails.version >= 61) {
                    return func(constraints);
                }
                constraints = JSON.parse(JSON.stringify(constraints));
                if (constraints && typeof constraints.audio === 'object') {
                    var remap = function(obj, a, b) {
                        if (a in obj && !(b in obj)) {
                            obj[b] = obj[a];
                            delete obj[a];
                        }
                    };
                    constraints = JSON.parse(JSON.stringify(constraints));
                    remap(constraints.audio, 'autoGainControl', 'googAutoGainControl');
                    remap(constraints.audio, 'noiseSuppression', 'googNoiseSuppression');
                    constraints.audio = constraintsToChrome_(constraints.audio);
                }
                if (constraints && typeof constraints.video === 'object') {
                    // Shim facingMode for mobile & surface pro.
                    var face = constraints.video.facingMode;
                    face = face && ((typeof face === 'object') ? face : {ideal: face});
                    var getSupportedFacingModeLies = browserDetails.version < 66;

                    if ((face && (face.exact === 'user' || face.exact === 'environment' ||
                        face.ideal === 'user' || face.ideal === 'environment')) &&
                        !(navigator.mediaDevices.getSupportedConstraints &&
                            navigator.mediaDevices.getSupportedConstraints().facingMode &&
                            !getSupportedFacingModeLies)) {
                        delete constraints.video.facingMode;
                        var matches;
                        if (face.exact === 'environment' || face.ideal === 'environment') {
                            matches = ['back', 'rear'];
                        } else if (face.exact === 'user' || face.ideal === 'user') {
                            matches = ['front'];
                        }
                        if (matches) {
                            // Look for matches in label, or use last cam for back (typical).
                            return navigator.mediaDevices.enumerateDevices()
                                .then(function(devices) {
                                    devices = devices.filter(function(d) {
                                        return d.kind === 'videoinput';
                                    });
                                    var dev = devices.find(function(d) {
                                        return matches.some(function(match) {
                                            return d.label.toLowerCase().indexOf(match) !== -1;
                                        });
                                    });
                                    if (!dev && devices.length && matches.indexOf('back') !== -1) {
                                        dev = devices[devices.length - 1]; // more likely the back cam
                                    }
                                    if (dev) {
                                        constraints.video.deviceId = face.exact ? {exact: dev.deviceId} :
                                            {ideal: dev.deviceId};
                                    }
                                    constraints.video = constraintsToChrome_(constraints.video);
                                    logging('chrome: ' + JSON.stringify(constraints));
                                    return func(constraints);
                                });
                        }
                    }
                    constraints.video = constraintsToChrome_(constraints.video);
                }
                logging('chrome: ' + JSON.stringify(constraints));
                return func(constraints);
            };

            var shimError_ = function(e) {
                return {
                    name: {
                        PermissionDeniedError: 'NotAllowedError',
                        InvalidStateError: 'NotReadableError',
                        DevicesNotFoundError: 'NotFoundError',
                        ConstraintNotSatisfiedError: 'OverconstrainedError',
                        TrackStartError: 'NotReadableError',
                        MediaDeviceFailedDueToShutdown: 'NotReadableError',
                        MediaDeviceKillSwitchOn: 'NotReadableError'
                    }[e.name] || e.name,
                    message: e.message,
                    constraint: e.constraintName,
                    toString: function() {
                        return this.name + (this.message && ': ') + this.message;
                    }
                };
            };

            var getUserMedia_ = function(constraints, onSuccess, onError) {
                shimConstraints_(constraints, function(c) {
                    navigator.webkitGetUserMedia(c, onSuccess, function(e) {
                        if (onError) {
                            onError(shimError_(e));
                        }
                    });
                });
            };

            navigator.getUserMedia = getUserMedia_;

            // Returns the result of getUserMedia as a Promise.
            var getUserMediaPromise_ = function(constraints) {
                return new Promise(function(resolve, reject) {
                    navigator.getUserMedia(constraints, resolve, reject);
                });
            };

            if (!navigator.mediaDevices) {
                navigator.mediaDevices = {
                    getUserMedia: getUserMediaPromise_,
                    enumerateDevices: function() {
                        return new Promise(function(resolve) {
                            var kinds = {audio: 'audioinput', video: 'videoinput'};
                            return window.MediaStreamTrack.getSources(function(devices) {
                                resolve(devices.map(function(device) {
                                    return {label: device.label,
                                        kind: kinds[device.kind],
                                        deviceId: device.id,
                                        groupId: ''};
                                }));
                            });
                        });
                    },
                    getSupportedConstraints: function() {
                        return {
                            deviceId: true, echoCancellation: true, facingMode: true,
                            frameRate: true, height: true, width: true
                        };
                    }
                };
            }

            // A shim for getUserMedia method on the mediaDevices object.
            // TODO(KaptenJansson) remove once implemented in Chrome stable.
            if (!navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia = function(constraints) {
                    return getUserMediaPromise_(constraints);
                };
            } else {
                // Even though Chrome 45 has navigator.mediaDevices and a getUserMedia
                // function which returns a Promise, it does not accept spec-style
                // constraints.
                var origGetUserMedia = navigator.mediaDevices.getUserMedia.
                bind(navigator.mediaDevices);
                navigator.mediaDevices.getUserMedia = function(cs) {
                    return shimConstraints_(cs, function(c) {
                        return origGetUserMedia(c).then(function(stream) {
                            if (c.audio && !stream.getAudioTracks().length ||
                                c.video && !stream.getVideoTracks().length) {
                                stream.getTracks().forEach(function(track) {
                                    track.stop();
                                });
                                throw new DOMException('', 'NotFoundError');
                            }
                            return stream;
                        }, function(e) {
                            return Promise.reject(shimError_(e));
                        });
                    });
                };
            }

            // Dummy devicechange event methods.
            // TODO(KaptenJansson) remove once implemented in Chrome stable.
            if (typeof navigator.mediaDevices.addEventListener === 'undefined') {
                navigator.mediaDevices.addEventListener = function() {
                    logging('Dummy mediaDevices.addEventListener called.');
                };
            }
            if (typeof navigator.mediaDevices.removeEventListener === 'undefined') {
                navigator.mediaDevices.removeEventListener = function() {
                    logging('Dummy mediaDevices.removeEventListener called.');
                };
            }
        };

    },{"../utils.js":13}],7:[function(require,module,exports){
        /*
 *  Copyright (c) 2017 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
        /* eslint-env node */
        'use strict';

        var SDPUtils = require('sdp');
        var utils = require('./utils');

// Wraps the peerconnection event eventNameToWrap in a function
// which returns the modified event object.
        function wrapPeerConnectionEvent(window, eventNameToWrap, wrapper) {
            if (!window.RTCPeerConnection) {
                return;
            }
            var proto = window.RTCPeerConnection.prototype;
            var nativeAddEventListener = proto.addEventListener;
            proto.addEventListener = function(nativeEventName, cb) {
                if (nativeEventName !== eventNameToWrap) {
                    return nativeAddEventListener.apply(this, arguments);
                }
                var wrappedCallback = function(e) {
                    cb(wrapper(e));
                };
                this._eventMap = this._eventMap || {};
                this._eventMap[cb] = wrappedCallback;
                return nativeAddEventListener.apply(this, [nativeEventName,
                    wrappedCallback]);
            };

            var nativeRemoveEventListener = proto.removeEventListener;
            proto.removeEventListener = function(nativeEventName, cb) {
                if (nativeEventName !== eventNameToWrap || !this._eventMap
                    || !this._eventMap[cb]) {
                    return nativeRemoveEventListener.apply(this, arguments);
                }
                var unwrappedCb = this._eventMap[cb];
                delete this._eventMap[cb];
                return nativeRemoveEventListener.apply(this, [nativeEventName,
                    unwrappedCb]);
            };

            Object.defineProperty(proto, 'on' + eventNameToWrap, {
                get: function() {
                    return this['_on' + eventNameToWrap];
                },
                set: function(cb) {
                    if (this['_on' + eventNameToWrap]) {
                        this.removeEventListener(eventNameToWrap,
                            this['_on' + eventNameToWrap]);
                        delete this['_on' + eventNameToWrap];
                    }
                    if (cb) {
                        this.addEventListener(eventNameToWrap,
                            this['_on' + eventNameToWrap] = cb);
                    }
                }
            });
        }

        module.exports = {
            shimRTCIceCandidate: function(window) {
                // foundation is arbitrarily chosen as an indicator for full support for
                // https://w3c.github.io/webrtc-pc/#rtcicecandidate-interface
                if (window.RTCIceCandidate && 'foundation' in
                    window.RTCIceCandidate.prototype) {
                    return;
                }

                var NativeRTCIceCandidate = window.RTCIceCandidate;
                window.RTCIceCandidate = function(args) {
                    // Remove the a= which shouldn't be part of the candidate string.
                    if (typeof args === 'object' && args.candidate &&
                        args.candidate.indexOf('a=') === 0) {
                        args = JSON.parse(JSON.stringify(args));
                        args.candidate = args.candidate.substr(2);
                    }

                    // Augment the native candidate with the parsed fields.
                    var nativeCandidate = new NativeRTCIceCandidate(args);
                    var parsedCandidate = SDPUtils.parseCandidate(args.candidate);
                    var augmentedCandidate = Object.assign(nativeCandidate,
                        parsedCandidate);

                    // Add a serializer that does not serialize the extra attributes.
                    augmentedCandidate.toJSON = function() {
                        return {
                            candidate: augmentedCandidate.candidate,
                            sdpMid: augmentedCandidate.sdpMid,
                            sdpMLineIndex: augmentedCandidate.sdpMLineIndex,
                            usernameFragment: augmentedCandidate.usernameFragment,
                        };
                    };
                    return augmentedCandidate;
                };

                // Hook up the augmented candidate in onicecandidate and
                // addEventListener('icecandidate', ...)
                wrapPeerConnectionEvent(window, 'icecandidate', function(e) {
                    if (e.candidate) {
                        Object.defineProperty(e, 'candidate', {
                            value: new window.RTCIceCandidate(e.candidate),
                            writable: 'false'
                        });
                    }
                    return e;
                });
            },

            // shimCreateObjectURL must be called before shimSourceObject to avoid loop.

            shimCreateObjectURL: function(window) {
                var URL = window && window.URL;

                if (!(typeof window === 'object' && window.HTMLMediaElement &&
                    'srcObject' in window.HTMLMediaElement.prototype &&
                    URL.createObjectURL && URL.revokeObjectURL)) {
                    // Only shim CreateObjectURL using srcObject if srcObject exists.
                    return undefined;
                }

                var nativeCreateObjectURL = URL.createObjectURL.bind(URL);
                var nativeRevokeObjectURL = URL.revokeObjectURL.bind(URL);
                var streams = new Map(), newId = 0;

                URL.createObjectURL = function(stream) {
                    if ('getTracks' in stream) {
                        var url = 'polyblob:' + (++newId);
                        streams.set(url, stream);
                        utils.deprecated('URL.createObjectURL(stream)',
                            'elem.srcObject = stream');
                        return url;
                    }
                    return nativeCreateObjectURL(stream);
                };
                URL.revokeObjectURL = function(url) {
                    nativeRevokeObjectURL(url);
                    streams.delete(url);
                };

                var dsc = Object.getOwnPropertyDescriptor(window.HTMLMediaElement.prototype,
                    'src');
                Object.defineProperty(window.HTMLMediaElement.prototype, 'src', {
                    get: function() {
                        return dsc.get.apply(this);
                    },
                    set: function(url) {
                        this.srcObject = streams.get(url) || null;
                        return dsc.set.apply(this, [url]);
                    }
                });

                var nativeSetAttribute = window.HTMLMediaElement.prototype.setAttribute;
                window.HTMLMediaElement.prototype.setAttribute = function() {
                    if (arguments.length === 2 &&
                        ('' + arguments[0]).toLowerCase() === 'src') {
                        this.srcObject = streams.get(arguments[1]) || null;
                    }
                    return nativeSetAttribute.apply(this, arguments);
                };
            }
        };

    },{"./utils":13,"sdp":2}],8:[function(require,module,exports){
        /*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
        /* eslint-env node */
        'use strict';

        var utils = require('../utils');
        var shimRTCPeerConnection = require('rtcpeerconnection-shim');

        module.exports = {
            shimGetUserMedia: require('./getusermedia'),
            shimPeerConnection: function(window) {
                var browserDetails = utils.detectBrowser(window);

                if (window.RTCIceGatherer) {
                    // ORTC defines an RTCIceCandidate object but no constructor.
                    // Not implemented in Edge.
                    if (!window.RTCIceCandidate) {
                        window.RTCIceCandidate = function(args) {
                            return args;
                        };
                    }
                    // ORTC does not have a session description object but
                    // other browsers (i.e. Chrome) that will support both PC and ORTC
                    // in the future might have this defined already.
                    if (!window.RTCSessionDescription) {
                        window.RTCSessionDescription = function(args) {
                            return args;
                        };
                    }
                    // this adds an additional event listener to MediaStrackTrack that signals
                    // when a tracks enabled property was changed. Workaround for a bug in
                    // addStream, see below. No longer required in 15025+
                    if (browserDetails.version < 15025) {
                        var origMSTEnabled = Object.getOwnPropertyDescriptor(
                            window.MediaStreamTrack.prototype, 'enabled');
                        Object.defineProperty(window.MediaStreamTrack.prototype, 'enabled', {
                            set: function(value) {
                                origMSTEnabled.set.call(this, value);
                                var ev = new Event('enabled');
                                ev.enabled = value;
                                this.dispatchEvent(ev);
                            }
                        });
                    }
                }

                // ORTC defines the DTMF sender a bit different.
                // https://github.com/w3c/ortc/issues/714
                if (window.RTCRtpSender && !('dtmf' in window.RTCRtpSender.prototype)) {
                    Object.defineProperty(window.RTCRtpSender.prototype, 'dtmf', {
                        get: function() {
                            if (this._dtmf === undefined) {
                                if (this.track.kind === 'audio') {
                                    this._dtmf = new window.RTCDtmfSender(this);
                                } else if (this.track.kind === 'video') {
                                    this._dtmf = null;
                                }
                            }
                            return this._dtmf;
                        }
                    });
                }

                window.RTCPeerConnection =
                    shimRTCPeerConnection(window, browserDetails.version);
            },
            shimReplaceTrack: function(window) {
                // ORTC has replaceTrack -- https://github.com/w3c/ortc/issues/614
                if (window.RTCRtpSender &&
                    !('replaceTrack' in window.RTCRtpSender.prototype)) {
                    window.RTCRtpSender.prototype.replaceTrack =
                        window.RTCRtpSender.prototype.setTrack;
                }
            }
        };

    },{"../utils":13,"./getusermedia":9,"rtcpeerconnection-shim":1}],9:[function(require,module,exports){
        /*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
        /* eslint-env node */
        'use strict';

// Expose public methods.
        module.exports = function(window) {
            var navigator = window && window.navigator;

            var shimError_ = function(e) {
                return {
                    name: {PermissionDeniedError: 'NotAllowedError'}[e.name] || e.name,
                    message: e.message,
                    constraint: e.constraint,
                    toString: function() {
                        return this.name;
                    }
                };
            };

            // getUserMedia error shim.
            var origGetUserMedia = navigator.mediaDevices.getUserMedia.
            bind(navigator.mediaDevices);
            navigator.mediaDevices.getUserMedia = function(c) {
                return origGetUserMedia(c).catch(function(e) {
                    return Promise.reject(shimError_(e));
                });
            };
        };

    },{}],10:[function(require,module,exports){
        /*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
        /* eslint-env node */
        'use strict';

        var utils = require('../utils');

        var firefoxShim = {
            shimOnTrack: function(window) {
                if (typeof window === 'object' && window.RTCPeerConnection && !('ontrack' in
                    window.RTCPeerConnection.prototype)) {
                    Object.defineProperty(window.RTCPeerConnection.prototype, 'ontrack', {
                        get: function() {
                            return this._ontrack;
                        },
                        set: function(f) {
                            if (this._ontrack) {
                                this.removeEventListener('track', this._ontrack);
                                this.removeEventListener('addstream', this._ontrackpoly);
                            }
                            this.addEventListener('track', this._ontrack = f);
                            this.addEventListener('addstream', this._ontrackpoly = function(e) {
                                e.stream.getTracks().forEach(function(track) {
                                    var event = new Event('track');
                                    event.track = track;
                                    event.receiver = {track: track};
                                    event.transceiver = {receiver: event.receiver};
                                    event.streams = [e.stream];
                                    this.dispatchEvent(event);
                                }.bind(this));
                            }.bind(this));
                        }
                    });
                }
                if (typeof window === 'object' && window.RTCTrackEvent &&
                    ('receiver' in window.RTCTrackEvent.prototype) &&
                    !('transceiver' in window.RTCTrackEvent.prototype)) {
                    Object.defineProperty(window.RTCTrackEvent.prototype, 'transceiver', {
                        get: function() {
                            return {receiver: this.receiver};
                        }
                    });
                }
            },

            shimSourceObject: function(window) {
                // Firefox has supported mozSrcObject since FF22, unprefixed in 42.
                if (typeof window === 'object') {
                    if (window.HTMLMediaElement &&
                        !('srcObject' in window.HTMLMediaElement.prototype)) {
                        // Shim the srcObject property, once, when HTMLMediaElement is found.
                        Object.defineProperty(window.HTMLMediaElement.prototype, 'srcObject', {
                            get: function() {
                                return this.mozSrcObject;
                            },
                            set: function(stream) {
                                this.mozSrcObject = stream;
                            }
                        });
                    }
                }
            },

            shimPeerConnection: function(window) {
                var browserDetails = utils.detectBrowser(window);

                if (typeof window !== 'object' || !(window.RTCPeerConnection ||
                    window.mozRTCPeerConnection)) {
                    return; // probably media.peerconnection.enabled=false in about:config
                }
                // The RTCPeerConnection object.
                if (!window.RTCPeerConnection) {
                    window.RTCPeerConnection = function(pcConfig, pcConstraints) {
                        if (browserDetails.version < 38) {
                            // .urls is not supported in FF < 38.
                            // create RTCIceServers with a single url.
                            if (pcConfig && pcConfig.iceServers) {
                                var newIceServers = [];
                                for (var i = 0; i < pcConfig.iceServers.length; i++) {
                                    var server = pcConfig.iceServers[i];
                                    if (server.hasOwnProperty('urls')) {
                                        for (var j = 0; j < server.urls.length; j++) {
                                            var newServer = {
                                                url: server.urls[j]
                                            };
                                            if (server.urls[j].indexOf('turn') === 0) {
                                                newServer.username = server.username;
                                                newServer.credential = server.credential;
                                            }
                                            newIceServers.push(newServer);
                                        }
                                    } else {
                                        newIceServers.push(pcConfig.iceServers[i]);
                                    }
                                }
                                pcConfig.iceServers = newIceServers;
                            }
                        }
                        return new window.mozRTCPeerConnection(pcConfig, pcConstraints);
                    };
                    window.RTCPeerConnection.prototype =
                        window.mozRTCPeerConnection.prototype;

                    // wrap static methods. Currently just generateCertificate.
                    if (window.mozRTCPeerConnection.generateCertificate) {
                        Object.defineProperty(window.RTCPeerConnection, 'generateCertificate', {
                            get: function() {
                                return window.mozRTCPeerConnection.generateCertificate;
                            }
                        });
                    }

                    window.RTCSessionDescription = window.mozRTCSessionDescription;
                    window.RTCIceCandidate = window.mozRTCIceCandidate;
                }

                // shim away need for obsolete RTCIceCandidate/RTCSessionDescription.
                ['setLocalDescription', 'setRemoteDescription', 'addIceCandidate']
                    .forEach(function(method) {
                        var nativeMethod = window.RTCPeerConnection.prototype[method];
                        window.RTCPeerConnection.prototype[method] = function() {
                            arguments[0] = new ((method === 'addIceCandidate') ?
                                window.RTCIceCandidate :
                                window.RTCSessionDescription)(arguments[0]);
                            return nativeMethod.apply(this, arguments);
                        };
                    });

                // support for addIceCandidate(null or undefined)
                var nativeAddIceCandidate =
                    window.RTCPeerConnection.prototype.addIceCandidate;
                window.RTCPeerConnection.prototype.addIceCandidate = function() {
                    if (!arguments[0]) {
                        if (arguments[1]) {
                            arguments[1].apply(null);
                        }
                        return Promise.resolve();
                    }
                    return nativeAddIceCandidate.apply(this, arguments);
                };

                // shim getStats with maplike support
                var makeMapStats = function(stats) {
                    var map = new Map();
                    Object.keys(stats).forEach(function(key) {
                        map.set(key, stats[key]);
                        map[key] = stats[key];
                    });
                    return map;
                };

                var modernStatsTypes = {
                    inboundrtp: 'inbound-rtp',
                    outboundrtp: 'outbound-rtp',
                    candidatepair: 'candidate-pair',
                    localcandidate: 'local-candidate',
                    remotecandidate: 'remote-candidate'
                };

                var nativeGetStats = window.RTCPeerConnection.prototype.getStats;
                window.RTCPeerConnection.prototype.getStats = function(
                    selector,
                    onSucc,
                    onErr
                ) {
                    return nativeGetStats.apply(this, [selector || null])
                        .then(function(stats) {
                            if (browserDetails.version < 48) {
                                stats = makeMapStats(stats);
                            }
                            if (browserDetails.version < 53 && !onSucc) {
                                // Shim only promise getStats with spec-hyphens in type names
                                // Leave callback version alone; misc old uses of forEach before Map
                                try {
                                    stats.forEach(function(stat) {
                                        stat.type = modernStatsTypes[stat.type] || stat.type;
                                    });
                                } catch (e) {
                                    if (e.name !== 'TypeError') {
                                        throw e;
                                    }
                                    // Avoid TypeError: "type" is read-only, in old versions. 34-43ish
                                    stats.forEach(function(stat, i) {
                                        stats.set(i, Object.assign({}, stat, {
                                            type: modernStatsTypes[stat.type] || stat.type
                                        }));
                                    });
                                }
                            }
                            return stats;
                        })
                        .then(onSucc, onErr);
                };
            },

            shimRemoveStream: function(window) {
                if (!window.RTCPeerConnection ||
                    'removeStream' in window.RTCPeerConnection.prototype) {
                    return;
                }
                window.RTCPeerConnection.prototype.removeStream = function(stream) {
                    var pc = this;
                    utils.deprecated('removeStream', 'removeTrack');
                    this.getSenders().forEach(function(sender) {
                        if (sender.track && stream.getTracks().indexOf(sender.track) !== -1) {
                            pc.removeTrack(sender);
                        }
                    });
                };
            }
        };

// Expose public methods.
        module.exports = {
            shimOnTrack: firefoxShim.shimOnTrack,
            shimSourceObject: firefoxShim.shimSourceObject,
            shimPeerConnection: firefoxShim.shimPeerConnection,
            shimRemoveStream: firefoxShim.shimRemoveStream,
            shimGetUserMedia: require('./getusermedia')
        };

    },{"../utils":13,"./getusermedia":11}],11:[function(require,module,exports){
        /*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
        /* eslint-env node */
        'use strict';

        var utils = require('../utils');
        var logging = utils.log;

// Expose public methods.
        module.exports = function(window) {
            var browserDetails = utils.detectBrowser(window);
            var navigator = window && window.navigator;
            var MediaStreamTrack = window && window.MediaStreamTrack;

            var shimError_ = function(e) {
                return {
                    name: {
                        InternalError: 'NotReadableError',
                        NotSupportedError: 'TypeError',
                        PermissionDeniedError: 'NotAllowedError',
                        SecurityError: 'NotAllowedError'
                    }[e.name] || e.name,
                    message: {
                        'The operation is insecure.': 'The request is not allowed by the ' +
                            'user agent or the platform in the current context.'
                    }[e.message] || e.message,
                    constraint: e.constraint,
                    toString: function() {
                        return this.name + (this.message && ': ') + this.message;
                    }
                };
            };

            // getUserMedia constraints shim.
            var getUserMedia_ = function(constraints, onSuccess, onError) {
                var constraintsToFF37_ = function(c) {
                    if (typeof c !== 'object' || c.require) {
                        return c;
                    }
                    var require = [];
                    Object.keys(c).forEach(function(key) {
                        if (key === 'require' || key === 'advanced' || key === 'mediaSource') {
                            return;
                        }
                        var r = c[key] = (typeof c[key] === 'object') ?
                            c[key] : {ideal: c[key]};
                        if (r.min !== undefined ||
                            r.max !== undefined || r.exact !== undefined) {
                            require.push(key);
                        }
                        if (r.exact !== undefined) {
                            if (typeof r.exact === 'number') {
                                r. min = r.max = r.exact;
                            } else {
                                c[key] = r.exact;
                            }
                            delete r.exact;
                        }
                        if (r.ideal !== undefined) {
                            c.advanced = c.advanced || [];
                            var oc = {};
                            if (typeof r.ideal === 'number') {
                                oc[key] = {min: r.ideal, max: r.ideal};
                            } else {
                                oc[key] = r.ideal;
                            }
                            c.advanced.push(oc);
                            delete r.ideal;
                            if (!Object.keys(r).length) {
                                delete c[key];
                            }
                        }
                    });
                    if (require.length) {
                        c.require = require;
                    }
                    return c;
                };
                constraints = JSON.parse(JSON.stringify(constraints));
                if (browserDetails.version < 38) {
                    logging('spec: ' + JSON.stringify(constraints));
                    if (constraints.audio) {
                        constraints.audio = constraintsToFF37_(constraints.audio);
                    }
                    if (constraints.video) {
                        constraints.video = constraintsToFF37_(constraints.video);
                    }
                    logging('ff37: ' + JSON.stringify(constraints));
                }
                return navigator.mozGetUserMedia(constraints, onSuccess, function(e) {
                    onError(shimError_(e));
                });
            };

            // Returns the result of getUserMedia as a Promise.
            var getUserMediaPromise_ = function(constraints) {
                return new Promise(function(resolve, reject) {
                    getUserMedia_(constraints, resolve, reject);
                });
            };

            // Shim for mediaDevices on older versions.
            if (!navigator.mediaDevices) {
                navigator.mediaDevices = {getUserMedia: getUserMediaPromise_,
                    addEventListener: function() { },
                    removeEventListener: function() { }
                };
            }
            navigator.mediaDevices.enumerateDevices =
                navigator.mediaDevices.enumerateDevices || function() {
                    return new Promise(function(resolve) {
                        var infos = [
                            {kind: 'audioinput', deviceId: 'default', label: '', groupId: ''},
                            {kind: 'videoinput', deviceId: 'default', label: '', groupId: ''}
                        ];
                        resolve(infos);
                    });
                };

            if (browserDetails.version < 41) {
                // Work around http://bugzil.la/1169665
                var orgEnumerateDevices =
                    navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
                navigator.mediaDevices.enumerateDevices = function() {
                    return orgEnumerateDevices().then(undefined, function(e) {
                        if (e.name === 'NotFoundError') {
                            return [];
                        }
                        throw e;
                    });
                };
            }
            if (browserDetails.version < 49) {
                var origGetUserMedia = navigator.mediaDevices.getUserMedia.
                bind(navigator.mediaDevices);
                navigator.mediaDevices.getUserMedia = function(c) {
                    return origGetUserMedia(c).then(function(stream) {
                        // Work around https://bugzil.la/802326
                        if (c.audio && !stream.getAudioTracks().length ||
                            c.video && !stream.getVideoTracks().length) {
                            stream.getTracks().forEach(function(track) {
                                track.stop();
                            });
                            throw new DOMException('The object can not be found here.',
                                'NotFoundError');
                        }
                        return stream;
                    }, function(e) {
                        return Promise.reject(shimError_(e));
                    });
                };
            }
            if (!(browserDetails.version > 55 &&
                'autoGainControl' in navigator.mediaDevices.getSupportedConstraints())) {
                var remap = function(obj, a, b) {
                    if (a in obj && !(b in obj)) {
                        obj[b] = obj[a];
                        delete obj[a];
                    }
                };

                var nativeGetUserMedia = navigator.mediaDevices.getUserMedia.
                bind(navigator.mediaDevices);
                navigator.mediaDevices.getUserMedia = function(c) {
                    if (typeof c === 'object' && typeof c.audio === 'object') {
                        c = JSON.parse(JSON.stringify(c));
                        remap(c.audio, 'autoGainControl', 'mozAutoGainControl');
                        remap(c.audio, 'noiseSuppression', 'mozNoiseSuppression');
                    }
                    return nativeGetUserMedia(c);
                };

                if (MediaStreamTrack && MediaStreamTrack.prototype.getSettings) {
                    var nativeGetSettings = MediaStreamTrack.prototype.getSettings;
                    MediaStreamTrack.prototype.getSettings = function() {
                        var obj = nativeGetSettings.apply(this, arguments);
                        remap(obj, 'mozAutoGainControl', 'autoGainControl');
                        remap(obj, 'mozNoiseSuppression', 'noiseSuppression');
                        return obj;
                    };
                }

                if (MediaStreamTrack && MediaStreamTrack.prototype.applyConstraints) {
                    var nativeApplyConstraints = MediaStreamTrack.prototype.applyConstraints;
                    MediaStreamTrack.prototype.applyConstraints = function(c) {
                        if (this.kind === 'audio' && typeof c === 'object') {
                            c = JSON.parse(JSON.stringify(c));
                            remap(c, 'autoGainControl', 'mozAutoGainControl');
                            remap(c, 'noiseSuppression', 'mozNoiseSuppression');
                        }
                        return nativeApplyConstraints.apply(this, [c]);
                    };
                }
            }
            navigator.getUserMedia = function(constraints, onSuccess, onError) {
                if (browserDetails.version < 44) {
                    return getUserMedia_(constraints, onSuccess, onError);
                }
                // Replace Firefox 44+'s deprecation warning with unprefixed version.
                utils.deprecated('navigator.getUserMedia',
                    'navigator.mediaDevices.getUserMedia');
                navigator.mediaDevices.getUserMedia(constraints).then(onSuccess, onError);
            };
        };

    },{"../utils":13}],12:[function(require,module,exports){
        /*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
        'use strict';
        var utils = require('../utils');

        var safariShim = {
            // TODO: DrAlex, should be here, double check against LayoutTests

            // TODO: once the back-end for the mac port is done, add.
            // TODO: check for webkitGTK+
            // shimPeerConnection: function() { },

            shimLocalStreamsAPI: function(window) {
                if (typeof window !== 'object' || !window.RTCPeerConnection) {
                    return;
                }
                if (!('getLocalStreams' in window.RTCPeerConnection.prototype)) {
                    window.RTCPeerConnection.prototype.getLocalStreams = function() {
                        if (!this._localStreams) {
                            this._localStreams = [];
                        }
                        return this._localStreams;
                    };
                }
                if (!('getStreamById' in window.RTCPeerConnection.prototype)) {
                    window.RTCPeerConnection.prototype.getStreamById = function(id) {
                        var result = null;
                        if (this._localStreams) {
                            this._localStreams.forEach(function(stream) {
                                if (stream.id === id) {
                                    result = stream;
                                }
                            });
                        }
                        if (this._remoteStreams) {
                            this._remoteStreams.forEach(function(stream) {
                                if (stream.id === id) {
                                    result = stream;
                                }
                            });
                        }
                        return result;
                    };
                }
                if (!('addStream' in window.RTCPeerConnection.prototype)) {
                    var _addTrack = window.RTCPeerConnection.prototype.addTrack;
                    window.RTCPeerConnection.prototype.addStream = function(stream) {
                        if (!this._localStreams) {
                            this._localStreams = [];
                        }
                        if (this._localStreams.indexOf(stream) === -1) {
                            this._localStreams.push(stream);
                        }
                        var self = this;
                        stream.getTracks().forEach(function(track) {
                            _addTrack.call(self, track, stream);
                        });
                    };

                    window.RTCPeerConnection.prototype.addTrack = function(track, stream) {
                        if (stream) {
                            if (!this._localStreams) {
                                this._localStreams = [stream];
                            } else if (this._localStreams.indexOf(stream) === -1) {
                                this._localStreams.push(stream);
                            }
                        }
                        return _addTrack.call(this, track, stream);
                    };
                }
                if (!('removeStream' in window.RTCPeerConnection.prototype)) {
                    window.RTCPeerConnection.prototype.removeStream = function(stream) {
                        if (!this._localStreams) {
                            this._localStreams = [];
                        }
                        var index = this._localStreams.indexOf(stream);
                        if (index === -1) {
                            return;
                        }
                        this._localStreams.splice(index, 1);
                        var self = this;
                        var tracks = stream.getTracks();
                        this.getSenders().forEach(function(sender) {
                            if (tracks.indexOf(sender.track) !== -1) {
                                self.removeTrack(sender);
                            }
                        });
                    };
                }
            },
            shimRemoteStreamsAPI: function(window) {
                if (typeof window !== 'object' || !window.RTCPeerConnection) {
                    return;
                }
                if (!('getRemoteStreams' in window.RTCPeerConnection.prototype)) {
                    window.RTCPeerConnection.prototype.getRemoteStreams = function() {
                        return this._remoteStreams ? this._remoteStreams : [];
                    };
                }
                if (!('onaddstream' in window.RTCPeerConnection.prototype)) {
                    Object.defineProperty(window.RTCPeerConnection.prototype, 'onaddstream', {
                        get: function() {
                            return this._onaddstream;
                        },
                        set: function(f) {
                            if (this._onaddstream) {
                                this.removeEventListener('addstream', this._onaddstream);
                                this.removeEventListener('track', this._onaddstreampoly);
                            }
                            this.addEventListener('addstream', this._onaddstream = f);
                            this.addEventListener('track', this._onaddstreampoly = function(e) {
                                var stream = e.streams[0];
                                if (!this._remoteStreams) {
                                    this._remoteStreams = [];
                                }
                                if (this._remoteStreams.indexOf(stream) >= 0) {
                                    return;
                                }
                                this._remoteStreams.push(stream);
                                var event = new Event('addstream');
                                event.stream = e.streams[0];
                                this.dispatchEvent(event);
                            }.bind(this));
                        }
                    });
                }
            },
            shimCallbacksAPI: function(window) {
                if (typeof window !== 'object' || !window.RTCPeerConnection) {
                    return;
                }
                var prototype = window.RTCPeerConnection.prototype;
                var createOffer = prototype.createOffer;
                var createAnswer = prototype.createAnswer;
                var setLocalDescription = prototype.setLocalDescription;
                var setRemoteDescription = prototype.setRemoteDescription;
                var addIceCandidate = prototype.addIceCandidate;

                prototype.createOffer = function(successCallback, failureCallback) {
                    var options = (arguments.length >= 2) ? arguments[2] : arguments[0];
                    var promise = createOffer.apply(this, [options]);
                    if (!failureCallback) {
                        return promise;
                    }
                    promise.then(successCallback, failureCallback);
                    return Promise.resolve();
                };

                prototype.createAnswer = function(successCallback, failureCallback) {
                    var options = (arguments.length >= 2) ? arguments[2] : arguments[0];
                    var promise = createAnswer.apply(this, [options]);
                    if (!failureCallback) {
                        return promise;
                    }
                    promise.then(successCallback, failureCallback);
                    return Promise.resolve();
                };

                var withCallback = function(description, successCallback, failureCallback) {
                    var promise = setLocalDescription.apply(this, [description]);
                    if (!failureCallback) {
                        return promise;
                    }
                    promise.then(successCallback, failureCallback);
                    return Promise.resolve();
                };
                prototype.setLocalDescription = withCallback;

                withCallback = function(description, successCallback, failureCallback) {
                    var promise = setRemoteDescription.apply(this, [description]);
                    if (!failureCallback) {
                        return promise;
                    }
                    promise.then(successCallback, failureCallback);
                    return Promise.resolve();
                };
                prototype.setRemoteDescription = withCallback;

                withCallback = function(candidate, successCallback, failureCallback) {
                    var promise = addIceCandidate.apply(this, [candidate]);
                    if (!failureCallback) {
                        return promise;
                    }
                    promise.then(successCallback, failureCallback);
                    return Promise.resolve();
                };
                prototype.addIceCandidate = withCallback;
            },
            shimGetUserMedia: function(window) {
                var navigator = window && window.navigator;

                if (!navigator.getUserMedia) {
                    if (navigator.webkitGetUserMedia) {
                        navigator.getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
                    } else if (navigator.mediaDevices &&
                        navigator.mediaDevices.getUserMedia) {
                        navigator.getUserMedia = function(constraints, cb, errcb) {
                            navigator.mediaDevices.getUserMedia(constraints)
                                .then(cb, errcb);
                        }.bind(navigator);
                    }
                }
            },
            shimRTCIceServerUrls: function(window) {
                // migrate from non-spec RTCIceServer.url to RTCIceServer.urls
                var OrigPeerConnection = window.RTCPeerConnection;
                window.RTCPeerConnection = function(pcConfig, pcConstraints) {
                    if (pcConfig && pcConfig.iceServers) {
                        var newIceServers = [];
                        for (var i = 0; i < pcConfig.iceServers.length; i++) {
                            var server = pcConfig.iceServers[i];
                            if (!server.hasOwnProperty('urls') &&
                                server.hasOwnProperty('url')) {
                                utils.deprecated('RTCIceServer.url', 'RTCIceServer.urls');
                                server = JSON.parse(JSON.stringify(server));
                                server.urls = server.url;
                                delete server.url;
                                newIceServers.push(server);
                            } else {
                                newIceServers.push(pcConfig.iceServers[i]);
                            }
                        }
                        pcConfig.iceServers = newIceServers;
                    }
                    return new OrigPeerConnection(pcConfig, pcConstraints);
                };
                window.RTCPeerConnection.prototype = OrigPeerConnection.prototype;
                // wrap static methods. Currently just generateCertificate.
                if ('generateCertificate' in window.RTCPeerConnection) {
                    Object.defineProperty(window.RTCPeerConnection, 'generateCertificate', {
                        get: function() {
                            return OrigPeerConnection.generateCertificate;
                        }
                    });
                }
            },
            shimTrackEventTransceiver: function(window) {
                // Add event.transceiver member over deprecated event.receiver
                if (typeof window === 'object' && window.RTCPeerConnection &&
                    ('receiver' in window.RTCTrackEvent.prototype) &&
                    // can't check 'transceiver' in window.RTCTrackEvent.prototype, as it is
                    // defined for some reason even when window.RTCTransceiver is not.
                    !window.RTCTransceiver) {
                    Object.defineProperty(window.RTCTrackEvent.prototype, 'transceiver', {
                        get: function() {
                            return {receiver: this.receiver};
                        }
                    });
                }
            },

            shimCreateOfferLegacy: function(window) {
                var origCreateOffer = window.RTCPeerConnection.prototype.createOffer;
                window.RTCPeerConnection.prototype.createOffer = function(offerOptions) {
                    var pc = this;
                    if (offerOptions) {
                        var audioTransceiver = pc.getTransceivers().find(function(transceiver) {
                            return transceiver.sender.track &&
                                transceiver.sender.track.kind === 'audio';
                        });
                        if (offerOptions.offerToReceiveAudio === false && audioTransceiver) {
                            if (audioTransceiver.direction === 'sendrecv') {
                                audioTransceiver.setDirection('sendonly');
                            } else if (audioTransceiver.direction === 'recvonly') {
                                audioTransceiver.setDirection('inactive');
                            }
                        } else if (offerOptions.offerToReceiveAudio === true &&
                            !audioTransceiver) {
                            pc.addTransceiver('audio');
                        }

                        var videoTransceiver = pc.getTransceivers().find(function(transceiver) {
                            return transceiver.sender.track &&
                                transceiver.sender.track.kind === 'video';
                        });
                        if (offerOptions.offerToReceiveVideo === false && videoTransceiver) {
                            if (videoTransceiver.direction === 'sendrecv') {
                                videoTransceiver.setDirection('sendonly');
                            } else if (videoTransceiver.direction === 'recvonly') {
                                videoTransceiver.setDirection('inactive');
                            }
                        } else if (offerOptions.offerToReceiveVideo === true &&
                            !videoTransceiver) {
                            pc.addTransceiver('video');
                        }
                    }
                    return origCreateOffer.apply(pc, arguments);
                };
            }
        };

// Expose public methods.
        module.exports = {
            shimCallbacksAPI: safariShim.shimCallbacksAPI,
            shimLocalStreamsAPI: safariShim.shimLocalStreamsAPI,
            shimRemoteStreamsAPI: safariShim.shimRemoteStreamsAPI,
            shimGetUserMedia: safariShim.shimGetUserMedia,
            shimRTCIceServerUrls: safariShim.shimRTCIceServerUrls,
            shimTrackEventTransceiver: safariShim.shimTrackEventTransceiver,
            shimCreateOfferLegacy: safariShim.shimCreateOfferLegacy
            // TODO
            // shimPeerConnection: safariShim.shimPeerConnection
        };

    },{"../utils":13}],13:[function(require,module,exports){
        /*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
        /* eslint-env node */
        'use strict';

        var logDisabled_ = true;
        var deprecationWarnings_ = true;

// Utility methods.
        var utils = {
            disableLog: function(bool) {
                if (typeof bool !== 'boolean') {
                    return new Error('Argument type: ' + typeof bool +
                        '. Please use a boolean.');
                }
                logDisabled_ = bool;
                return (bool) ? 'adapter.js logging disabled' :
                    'adapter.js logging enabled';
            },

            /**
             * Disable or enable deprecation warnings
             * @param {!boolean} bool set to true to disable warnings.
             */
            disableWarnings: function(bool) {
                if (typeof bool !== 'boolean') {
                    return new Error('Argument type: ' + typeof bool +
                        '. Please use a boolean.');
                }
                deprecationWarnings_ = !bool;
                return 'adapter.js deprecation warnings ' + (bool ? 'disabled' : 'enabled');
            },

            log: function() {
                if (typeof window === 'object') {
                    if (logDisabled_) {
                        return;
                    }
                    if (typeof console !== 'undefined' && typeof console.log === 'function') {
                        console.log.apply(console, arguments);
                    }
                }
            },

            /**
             * Shows a deprecation warning suggesting the modern and spec-compatible API.
             */
            deprecated: function(oldMethod, newMethod) {
                if (!deprecationWarnings_) {
                    return;
                }
                console.warn(oldMethod + ' is deprecated, please use ' + newMethod +
                    ' instead.');
            },

            /**
             * Extract browser version out of the provided user agent string.
             *
             * @param {!string} uastring userAgent string.
             * @param {!string} expr Regular expression used as match criteria.
             * @param {!number} pos position in the version string to be returned.
             * @return {!number} browser version.
             */
            extractVersion: function(uastring, expr, pos) {
                var match = uastring.match(expr);
                return match && match.length >= pos && parseInt(match[pos], 10);
            },

            /**
             * Browser detector.
             *
             * @return {object} result containing browser and version
             *     properties.
             */
            detectBrowser: function(window) {
                var navigator = window && window.navigator;

                // Returned result object.
                var result = {};
                result.browser = null;
                result.version = null;

                // Fail early if it's not a browser
                if (typeof window === 'undefined' || !window.navigator) {
                    result.browser = 'Not a browser.';
                    return result;
                }

                // Firefox.
                if (navigator.mozGetUserMedia) {
                    result.browser = 'firefox';
                    result.version = this.extractVersion(navigator.userAgent,
                        /Firefox\/(\d+)\./, 1);
                } else if (navigator.webkitGetUserMedia) {
                    // Chrome, Chromium, Webview, Opera, all use the chrome shim for now
                    if (window.webkitRTCPeerConnection) {
                        result.browser = 'chrome';
                        result.version = this.extractVersion(navigator.userAgent,
                            /Chrom(e|ium)\/(\d+)\./, 2);
                    } else { // Safari (in an unpublished version) or unknown webkit-based.
                        if (navigator.userAgent.match(/Version\/(\d+).(\d+)/)) {
                            result.browser = 'safari';
                            result.version = this.extractVersion(navigator.userAgent,
                                /AppleWebKit\/(\d+)\./, 1);
                        } else { // unknown webkit-based browser.
                            result.browser = 'Unsupported webkit-based browser ' +
                                'with GUM support but no WebRTC support.';
                            return result;
                        }
                    }
                } else if (navigator.mediaDevices &&
                    navigator.userAgent.match(/Edge\/(\d+).(\d+)$/)) { // Edge.
                    result.browser = 'edge';
                    result.version = this.extractVersion(navigator.userAgent,
                        /Edge\/(\d+).(\d+)$/, 2);
                } else if (navigator.mediaDevices &&
                    navigator.userAgent.match(/AppleWebKit\/(\d+)\./)) {
                    // Safari, with webkitGetUserMedia removed.
                    result.browser = 'safari';
                    result.version = this.extractVersion(navigator.userAgent,
                        /AppleWebKit\/(\d+)\./, 1);
                } else { // Default fallthrough: not supported.
                    result.browser = 'Not a supported browser.';
                    return result;
                }

                return result;
            },

        };

// Export.
        module.exports = {
            log: utils.log,
            deprecated: utils.deprecated,
            disableLog: utils.disableLog,
            disableWarnings: utils.disableWarnings,
            extractVersion: utils.extractVersion,
            shimCreateObjectURL: utils.shimCreateObjectURL,
            detectBrowser: utils.detectBrowser.bind(utils)
        };

    },{}]},{},[3])(3)
});

// JSFEAT

var jsfeat=jsfeat||{REVISION:"ALPHA"};(function(r){var o=1.192092896e-7;var l=1e-37;var m=256,i=512,h=1024,x=2048,w=4096;var A=1,n=2,b=3,p=4;var z=new Int32Array([-1,1,4,-1,4,-1,-1,-1,8,-1,-1,-1,-1,-1,-1,-1,8]);var y=(function(){return function(B){return(B&65280)}})();var k=(function(){return function(B){return(B&255)}})();var c=(function(){return function(B){return z[(B&65280)>>8]}})();var a=0;var f=1;var e=2;var u=3;var d=1;var s=1;var g=2;var v=(function(){function B(D,C){this.size=((D+7)|0)&-8;if(typeof C==="undefined"){this.buffer=new ArrayBuffer(this.size)}else{this.buffer=C;this.size=C.length}this.u8=new Uint8Array(this.buffer);this.i32=new Int32Array(this.buffer);this.f32=new Float32Array(this.buffer);this.f64=new Float64Array(this.buffer)}return B})();var q=(function(){function B(F,D,E,C){this.type=y(E)|0;this.channel=k(E)|0;this.cols=F|0;this.rows=D|0;if(typeof C==="undefined"){this.allocate()}else{this.buffer=C;this.data=this.type&m?this.buffer.u8:(this.type&i?this.buffer.i32:(this.type&h?this.buffer.f32:this.buffer.f64))}}B.prototype.allocate=function(){delete this.data;delete this.buffer;this.buffer=new v((this.cols*c(this.type)*this.channel)*this.rows);this.data=this.type&m?this.buffer.u8:(this.type&i?this.buffer.i32:(this.type&h?this.buffer.f32:this.buffer.f64))};B.prototype.copy_to=function(D){var C=D.data,G=this.data;var E=0,F=(this.cols*this.rows*this.channel)|0;for(;E<F-4;E+=4){C[E]=G[E];C[E+1]=G[E+1];C[E+2]=G[E+2];C[E+3]=G[E+3]}for(;E<F;++E){C[E]=G[E]}};B.prototype.resize=function(F,D,C){if(typeof C==="undefined"){C=this.channel}var E=(F*c(this.type)*C)*D;if(E>this.buffer.size){this.cols=F;this.rows=D;this.channel=C;this.allocate()}else{this.cols=F;this.rows=D;this.channel=C}};return B})();var t=(function(){function B(C){this.levels=C|0;this.data=new Array(C);this.pyrdown=jsfeat.imgproc.pyrdown}B.prototype.allocate=function(C,E,F){var D=this.levels;while(--D>=0){this.data[D]=new q(C>>D,E>>D,F)}};B.prototype.build=function(F,E){if(typeof E==="undefined"){E=true}var H=2,D=F,C=this.data[0];if(!E){var G=F.cols*F.rows;while(--G>=0){C.data[G]=F.data[G]}}C=this.data[1];this.pyrdown(D,C);for(;H<this.levels;++H){D=C;C=this.data[H];this.pyrdown(D,C)}};return B})();var j=(function(){function B(C,G,E,F,D){if(typeof C==="undefined"){C=0}if(typeof G==="undefined"){G=0}if(typeof E==="undefined"){E=0}if(typeof F==="undefined"){F=0}if(typeof D==="undefined"){D=-1}this.x=C;this.y=G;this.score=E;this.level=F;this.angle=D}return B})();r.U8_t=m;r.S32_t=i;r.F32_t=h;r.S64_t=x;r.F64_t=w;r.C1_t=A;r.C2_t=n;r.C3_t=b;r.C4_t=p;r.U8C1_t=m|A;r.U8C3_t=m|b;r.U8C4_t=m|p;r.F32C1_t=h|A;r.F32C2_t=h|n;r.S32C1_t=i|A;r.S32C2_t=i|n;r.EPSILON=o;r.FLT_MIN=l;r.COLOR_RGBA2GRAY=a;r.COLOR_RGB2GRAY=f;r.COLOR_BGRA2GRAY=e;r.COLOR_BGR2GRAY=u;r.BOX_BLUR_NOSCALE=d;r.SVD_U_T=s;r.SVD_V_T=g;r.get_data_type=y;r.get_channel=k;r.get_data_type_size=c;r.data_t=v;r.matrix_t=q;r.pyramid_t=t;r.keypoint_t=j})(jsfeat);(function(b){var a=(function(){var f=(function(){function g(h){this.next=null;this.data=new jsfeat.data_t(h);this.size=this.data.size;this.buffer=this.data.buffer;this.u8=this.data.u8;this.i32=this.data.i32;this.f32=this.data.f32;this.f64=this.data.f64}g.prototype.resize=function(h){delete this.data;this.data=new jsfeat.data_t(h);this.size=this.data.size;this.buffer=this.data.buffer;this.u8=this.data.u8;this.i32=this.data.i32;this.f32=this.data.f32;this.f64=this.data.f64};return g})();var e,c;var d=0;return{allocate:function(g,k){e=c=new f(k);for(var h=0;h<g;++h){var j=new f(k);c=c.next=j;d++}},get_buffer:function(g){var h=e;e=e.next;d--;if(g>h.size){h.resize(g)}return h},put_buffer:function(g){c=c.next=g;d++}}})();b.cache=a;a.allocate(30,640*4)})(jsfeat);(function(b){var a=(function(){var c=new Int32Array(48*2);return{get_gaussian_kernel:function(p,m,e,l){var f=0,j=0,o=0,n=0,d=0;var g=0;var h=jsfeat.cache.get_buffer(p<<2);var k=h.f32;if((p&1)==1&&p<=7&&m<=0){switch(p>>1){case 0:k[0]=1;g=1;break;case 1:k[0]=0.25,k[1]=0.5,k[2]=0.25;g=0.25+0.5+0.25;break;case 2:k[0]=0.0625,k[1]=0.25,k[2]=0.375,k[3]=0.25,k[4]=0.0625;g=0.0625+0.25+0.375+0.25+0.0625;break;case 3:k[0]=0.03125,k[1]=0.109375,k[2]=0.21875,k[3]=0.28125,k[4]=0.21875,k[5]=0.109375,k[6]=0.03125;g=0.03125+0.109375+0.21875+0.28125+0.21875+0.109375+0.03125;break}}else{n=m>0?m:((p-1)*0.5-1)*0.3+0.8;d=-0.5/(n*n);for(;f<p;++f){j=f-(p-1)*0.5;o=Math.exp(d*j*j);k[f]=o;g+=o}}if(l&jsfeat.U8_t){g=256/g;for(f=0;f<p;++f){e[f]=(k[f]*g+0.5)|0}}else{g=1/g;for(f=0;f<p;++f){e[f]=k[f]*g}}jsfeat.cache.put_buffer(h)},perspective_4point_transform:function(x,B,r,w,g,A,q,v,f,z,p,u,e,y,o,t,d){var Y=B;var X=z;var W=q;var V=Y*X*W;var U=o;var T=Y*U;var S=X*T;var R=p;var n=Y*R;var m=A;var k=r;var j=y;var i=k*j;var h=i*m;var ax=j*m*R;var aw=j*W;var aq=j*R;var ao=X*W;var am=U*X;var aj=U*m;var ag=R*m;var Q=1/(aw-aq-ao+am-aj+ag);var O=Y*j;var N=k*m;var M=W*Y;var L=U*M;var K=k*X;var I=i*R;var G=k*R*m;var D=W*U*X;var C=U*k;var av=-(S-V+n*m-m*T-i*X+h-ax+aw*X)*Q;var au=(V-S-O*W+O*R+h-X*N+aj*X-ax)*Q;var ar=Y;var ap=(-R*T+L+K*W-i*W+I-G+aj*R-D)*Q;var an=(-L+M*R-C*X+I-G+C*m+D-aw*R)*Q;var al=k;var ai=(-n+M+K-N+aq-aw-am+aj)*Q;var af=(-T+n+i-K+aj-ag-aw+ao)*Q;Y=w;X=u;W=f;V=Y*X*W;U=d;T=Y*U;S=X*T;R=e;n=Y*R;m=v;k=g;j=t;i=k*j;h=i*m;ax=j*m*R;aw=j*W;aq=j*R;ao=X*W;am=U*X;aj=U*m;ag=R*m;Q=1/(aw-aq-ao+am-aj+ag);O=Y*j;N=k*m;M=W*Y;L=U*M;K=k*X;I=i*R;G=k*R*m;D=W*U*X;C=U*k;var ak=-(S-V+n*m-m*T-i*X+h-ax+aw*X)*Q;var ah=(V-S-O*W+O*R+h-X*N+aj*X-ax)*Q;var ae=Y;var ad=(-R*T+L+K*W-i*W+I-G+aj*R-D)*Q;var ac=(-L+M*R-C*X+I-G+C*m+D-aw*R)*Q;var ab=k;var aa=(-n+M+K-N+aq-aw-am+aj)*Q;var Z=(-T+n+i-K+aj-ag-aw+ao)*Q;X=an-af*al;W=av*an;V=av*al;T=ap*au;S=ar*ap;n=au*ai;var l=ar*ai;j=1/(W-V*af-T+S*af+n*al-l*an);h=-ap+al*ai;var at=-ap*af+an*ai;ag=-au+ar*af;var P=av-l;N=av*af-n;M=-au*al+ar*an;var J=V-S;var H=W-T;G=X*j;var F=ag*j;var E=M*j;var s=x.data;s[0]=ak*G+ah*(h*j)-ae*(at*j);s[1]=ak*F+ah*(P*j)-ae*(N*j);s[2]=-ak*E-ah*(J*j)+ae*(H*j);s[3]=ad*G+ac*(h*j)-ab*(at*j);s[4]=ad*F+ac*(P*j)-ab*(N*j);s[5]=-ad*E-ac*(J*j)+ab*(H*j);s[6]=aa*G+Z*(h*j)-at*j;s[7]=aa*F+Z*(P*j)-N*j;s[8]=-aa*E-Z*(J*j)+H*j},qsort:function(o,J,s,u){var D=7;var v,r,q,p;var C=0,j=0,G=0,B=0,z=0,A=0,e=0,y=0,E=0;var x=0,w=0,h=0,g=0,l=0,I=0,H=0,F=0,f=0;var k=c;if((s-J+1)<=1){return}k[0]=J;k[1]=s;while(C>=0){j=k[C<<1];G=k[(C<<1)+1];C--;for(;;){z=(G-j)+1;if(z<=D){for(e=j+1;e<=G;e++){for(y=e;y>j&&u(o[y],o[y-1]);y--){v=o[y];o[y]=o[y-1];o[y-1]=v}}break}else{f=0;x=j;h=G;l=j+(z>>1);if(z>40){E=z>>3;I=j,H=j+E,F=j+(E<<1);r=o[I],q=o[H],p=o[F];j=u(r,q)?(u(q,p)?H:(u(r,p)?F:I)):(u(p,q)?H:(u(r,p)?I:F));I=l-E,H=l,F=l+E;r=o[I],q=o[H],p=o[F];l=u(r,q)?(u(q,p)?H:(u(r,p)?F:I)):(u(p,q)?H:(u(r,p)?I:F));I=G-(E<<1),H=G-E,F=G;r=o[I],q=o[H],p=o[F];G=u(r,q)?(u(q,p)?H:(u(r,p)?F:I)):(u(p,q)?H:(u(r,p)?I:F))}I=j,H=l,F=G;r=o[I],q=o[H],p=o[F];l=u(r,q)?(u(q,p)?H:(u(r,p)?F:I)):(u(p,q)?H:(u(r,p)?I:F));if(l!=x){v=o[l];o[l]=o[x];o[x]=v;l=x}j=w=x+1;G=g=h;r=o[l];for(;;){while(j<=G&&!u(r,o[j])){if(!u(o[j],r)){if(j>w){v=o[w];o[w]=o[j];o[j]=v}f=1;w++}j++}while(j<=G&&!u(o[G],r)){if(!u(r,o[G])){if(G<g){v=o[g];o[g]=o[G];o[G]=v}f=1;g--}G--}if(j>G){break}v=o[j];o[j]=o[G];o[G]=v;f=1;j++;G--}if(f==0){j=x,G=h;for(e=j+1;e<=G;e++){for(y=e;y>j&&u(o[y],o[y-1]);y--){v=o[y];o[y]=o[y-1];o[y-1]=v}}break}z=Math.min((w-x),(j-w));A=(j-z)|0;for(B=0;B<z;++B,++A){v=o[x+B];o[x+B]=o[A];o[A]=v}z=Math.min((h-g),(g-G));A=(h-z+1)|0;for(B=0;B<z;++B,++A){v=o[j+B];o[j+B]=o[A];o[A]=v}z=(j-w);A=(g-G);if(z>1){if(A>1){if(z>A){++C;k[C<<1]=x;k[(C<<1)+1]=x+z-1;j=h-A+1,G=h}else{++C;k[C<<1]=h-A+1;k[(C<<1)+1]=h;j=x,G=x+z-1}}else{j=x,G=x+z-1}}else{if(A>1){j=h-A+1,G=h}else{break}}}}}},median:function(k,d,i){var e;var f=0,j=0,g=0,h=(d+i)>>1;for(;;){if(i<=d){return k[h]}if(i==(d+1)){if(k[d]>k[i]){e=k[d];k[d]=k[i];k[i]=e}return k[h]}f=((d+i)>>1);if(k[f]>k[i]){e=k[f];k[f]=k[i];k[i]=e}if(k[d]>k[i]){e=k[d];k[d]=k[i];k[i]=e}if(k[f]>k[d]){e=k[f];k[f]=k[d];k[d]=e}j=(d+1);e=k[f];k[f]=k[j];k[j]=e;g=i;for(;;){do{++j}while(k[d]>k[j]);do{--g}while(k[g]>k[d]);if(g<j){break}e=k[j];k[j]=k[g];k[g]=e}e=k[d];k[d]=k[g];k[g]=e;if(g<=h){d=j}else{if(g>=h){i=(g-1)}}}return 0}}})();b.math=a})(jsfeat);(function(b){var a=(function(){return{identity:function(j,g){if(typeof g==="undefined"){g=1}var i=j.data;var f=j.rows,h=j.cols,e=(h+1)|0;var c=f*h;var d=c;while(--c>=0){i[c]=0}c=d;d=0;while(d<c){i[d]=g;d=d+e}},transpose:function(f,d){var l=0,h=0,k=d.rows,c=d.cols;var n=0,e=0,m=0;var o=d.data,g=f.data;for(;l<k;e+=1,n+=c,l++){m=e;for(h=0;h<c;m+=k,h++){g[m]=o[n+h]}}},multiply:function(l,n,m){var u=0,s=0,o=0;var r=0,t=0,q=0,w=0,g=0;var f=n.cols,e=n.rows,p=m.cols;var v=n.data,d=m.data,h=l.data;var c=0;for(;u<e;r+=f,u++){for(w=0,s=0;s<p;g++,w++,s++){q=w;t=r;c=0;for(o=0;o<f;t++,q+=p,o++){c+=v[t]*d[q]}h[g]=c}}},multiply_ABt:function(c,g,d){var p=0,n=0,m=0;var r=0,l=0,f=0,u=0;var e=g.cols,o=g.rows,q=d.rows;var v=g.data,t=d.data,h=c.data;var s=0;for(;p<o;r+=e,p++){for(f=0,n=0;n<q;u++,n++){l=r;s=0;for(m=0;m<e;l++,f++,m++){s+=v[l]*t[f]}h[u]=s}}},multiply_AtB:function(l,n,m){var u=0,s=0,o=0;var r=0,t=0,q=0,w=0,g=0;var f=n.cols,e=n.rows,p=m.cols;var v=n.data,d=m.data,h=l.data;var c=0;for(;u<f;r++,u++){for(w=0,s=0;s<p;g++,w++,s++){q=w;t=r;c=0;for(o=0;o<e;t+=f,q+=p,o++){c+=v[t]*d[q]}h[g]=c}}},multiply_AAt:function(d,h){var q=0,o=0,n=0;var c=0,r=0,m=0,g=0,e=0,u=0;var f=h.cols,p=h.rows;var t=h.data,l=d.data;var s=0;for(;q<p;c+=p+1,r=m,q++){e=c;u=c;g=r;for(o=q;o<p;e++,u+=p,o++){m=r;s=0;for(n=0;n<f;n++){s+=t[m++]*t[g++]}l[e]=s;l[u]=s}}},multiply_AtA:function(c,g){var r=0,p=0,n=0;var s=0,m=0,f=0,o=0,d=0,l=0;var e=g.cols,q=g.rows;var u=g.data,h=c.data;var t=0;for(;r<e;o+=e,r++){s=r;l=o+r;d=l;for(p=r;p<e;d++,l+=e,p++){m=s;f=p;t=0;for(n=0;n<q;m+=e,f+=e,n++){t+=u[m]*u[f]}h[d]=t;h[l]=t}}},identity_3x3:function(e,d){if(typeof d==="undefined"){d=1}var c=e.data;c[0]=c[4]=c[8]=d;c[1]=c[2]=c[3]=0;c[5]=c[6]=c[7]=0},invert_3x3:function(s,e){var o=s.data,h=e.data;var n=o[4];var m=o[8];var l=o[5];var k=o[7];var j=o[0];var i=j*n;var v=j*l;var u=o[3];var t=o[1];var r=u*t;var q=o[2];var p=u*q;var g=o[6];var f=g*t;var d=g*q;var c=1/(i*m-v*k-r*m+p*k+f*l-d*n);h[0]=(n*m-l*k)*c;h[1]=-(t*m-q*k)*c;h[2]=-(-t*l+q*n)*c;h[3]=-(u*m-l*g)*c;h[4]=(j*m-d)*c;h[5]=-(v-p)*c;h[6]=-(-u*k+n*g)*c;h[7]=-(j*k-f)*c;h[8]=(i-r)*c},multiply_3x3:function(r,v,t){var y=r.data,z=v.data,l=t.data;var x=z[0],w=z[1],u=z[2];var s=z[3],q=z[4],p=z[5];var o=z[6],n=z[7],m=z[8];var k=l[0],j=l[1],i=l[2];var h=l[3],g=l[4],f=l[5];var e=l[6],d=l[7],c=l[8];y[0]=x*k+w*h+u*e;y[1]=x*j+w*g+u*d;y[2]=x*i+w*f+u*c;y[3]=s*k+q*h+p*e;y[4]=s*j+q*g+p*d;y[5]=s*i+q*f+p*c;y[6]=o*k+n*h+m*e;y[7]=o*j+n*g+m*d;y[8]=o*i+n*f+m*c},mat3x3_determinant:function(d){var c=d.data;return c[0]*c[4]*c[8]-c[0]*c[5]*c[7]-c[3]*c[1]*c[8]+c[3]*c[2]*c[7]+c[6]*c[1]*c[5]-c[6]*c[2]*c[4]},determinant_3x3:function(h,g,f,e,d,c,k,j,i){return h*d*i-h*c*j-e*g*i+e*f*j+k*g*c-k*f*d}}})();b.matmath=a})(jsfeat);(function(b){var a=(function(){var f=function(g,j,i,h){h=g[j];g[j]=g[i];g[i]=h};var d=function(h,g){h=Math.abs(h);g=Math.abs(g);if(h>g){g/=h;return h*Math.sqrt(1+g*g)}if(g>0){h/=g;return g*Math.sqrt(1+h*h)}return 0};var c=function(H,o,q,r,h,I){var C=jsfeat.EPSILON;var N=0,M=0,L=0,J=0,K=0,D=0,R=0,G=0;var u=0,v=I*I*30;var E=0,U=0,F=0,x=0,z=0,B=0,Q=0,T=0,w=0;var P=jsfeat.cache.get_buffer(I<<2);var S=jsfeat.cache.get_buffer(I<<2);var O=P.i32;var g=S.i32;if(r){for(;N<I;N++){L=N*h;for(M=0;M<I;M++){r[L+M]=0}r[L+N]=1}}for(L=0;L<I;L++){q[L]=H[(o+1)*L];if(L<I-1){for(J=L+1,E=Math.abs(H[o*L+J]),N=L+2;N<I;N++){U=Math.abs(H[o*L+N]);if(E<U){E=U,J=N}}O[L]=J}if(L>0){for(J=0,E=Math.abs(H[L]),N=1;N<L;N++){U=Math.abs(H[o*N+L]);if(E<U){E=U,J=N}}g[L]=J}}if(I>1){for(;u<v;u++){for(L=0,E=Math.abs(H[O[0]]),N=1;N<I-1;N++){U=Math.abs(H[o*N+O[N]]);if(E<U){E=U,L=N}}K=O[L];for(N=1;N<I;N++){U=Math.abs(H[o*g[N]+N]);if(E<U){E=U,L=g[N],K=N}}F=H[o*L+K];if(Math.abs(F)<=C){break}x=(q[K]-q[L])*0.5;z=Math.abs(x)+d(F,x);B=d(F,z);Q=z/B;B=F/B;z=(F/z)*F;if(x<0){B=-B,z=-z}H[o*L+K]=0;q[L]-=z;q[K]+=z;for(N=0;N<L;N++){R=(o*N+L);G=(o*N+K);T=H[R];w=H[G];H[R]=T*Q-w*B;H[G]=T*B+w*Q}for(N=(L+1);N<K;N++){R=(o*L+N);G=(o*N+K);T=H[R];w=H[G];H[R]=T*Q-w*B;H[G]=T*B+w*Q}N=K+1;R=(o*L+N);G=(o*K+N);for(;N<I;N++,R++,G++){T=H[R];w=H[G];H[R]=T*Q-w*B;H[G]=T*B+w*Q}if(r){R=h*L;G=h*K;for(N=0;N<I;N++,R++,G++){T=r[R];w=r[G];r[R]=T*Q-w*B;r[G]=T*B+w*Q}}for(M=0;M<2;M++){D=M==0?L:K;if(D<I-1){for(J=D+1,E=Math.abs(H[o*D+J]),N=D+2;N<I;N++){U=Math.abs(H[o*D+N]);if(E<U){E=U,J=N}}O[D]=J}if(D>0){for(J=0,E=Math.abs(H[D]),N=1;N<D;N++){U=Math.abs(H[o*N+D]);if(E<U){E=U,J=N}}g[D]=J}}}}for(L=0;L<I-1;L++){J=L;for(N=L+1;N<I;N++){if(q[J]<q[N]){J=N}}if(L!=J){f(q,J,L,E);if(r){for(N=0;N<I;N++){f(r,h*J+N,h*L+N,E)}}}}jsfeat.cache.put_buffer(P);jsfeat.cache.put_buffer(S)};var e=function(D,l,h,M,v,T,S,E){var C=jsfeat.EPSILON*2;var q=jsfeat.FLT_MIN;var X=0,V=0,U=0,A=0,u=Math.max(T,30);var K=0,J=0,R=0,Q=0,F=0;var Y=0,O=0,N=0;var H=0,G=0,x=0,I=0,w=0,L=0,aa=0,P=0,Z=0;var z=4660;var B=0,y=0,o=0;var r=jsfeat.cache.get_buffer(S<<3);var g=r.f64;for(;X<S;X++){for(U=0,x=0;U<T;U++){N=D[X*l+U];x+=N*N}g[X]=x;if(M){for(U=0;U<S;U++){M[X*v+U]=0}M[X*v+X]=1}}for(;A<u;A++){F=0;for(X=0;X<S-1;X++){for(V=X+1;V<S;V++){K=(X*l)|0,J=(V*l)|0;aa=g[X],P=0,Z=g[V];U=2;P+=D[K]*D[J];P+=D[K+1]*D[J+1];for(;U<T;U++){P+=D[K+U]*D[J+U]}if(Math.abs(P)<=C*Math.sqrt(aa*Z)){continue}P*=2;I=aa-Z,w=d(P,I);if(I<0){L=(w-I)*0.5;O=Math.sqrt(L/w);Y=(P/(w*O*2))}else{Y=Math.sqrt((w+I)/(w*2));O=(P/(w*Y*2))}aa=0,Z=0;U=2;H=Y*D[K]+O*D[J];G=-O*D[K]+Y*D[J];D[K]=H;D[J]=G;aa+=H*H;Z+=G*G;H=Y*D[K+1]+O*D[J+1];G=-O*D[K+1]+Y*D[J+1];D[K+1]=H;D[J+1]=G;aa+=H*H;Z+=G*G;for(;U<T;U++){H=Y*D[K+U]+O*D[J+U];G=-O*D[K+U]+Y*D[J+U];D[K+U]=H;D[J+U]=G;aa+=H*H;Z+=G*G}g[X]=aa;g[V]=Z;F=1;if(M){R=(X*v)|0,Q=(V*v)|0;U=2;H=Y*M[R]+O*M[Q];G=-O*M[R]+Y*M[Q];M[R]=H;M[Q]=G;H=Y*M[R+1]+O*M[Q+1];G=-O*M[R+1]+Y*M[Q+1];M[R+1]=H;M[Q+1]=G;for(;U<S;U++){H=Y*M[R+U]+O*M[Q+U];G=-O*M[R+U]+Y*M[Q+U];M[R+U]=H;M[Q+U]=G}}}}if(F==0){break}}for(X=0;X<S;X++){for(U=0,x=0;U<T;U++){N=D[X*l+U];x+=N*N}g[X]=Math.sqrt(x)}for(X=0;X<S-1;X++){V=X;for(U=X+1;U<S;U++){if(g[V]<g[U]){V=U}}if(X!=V){f(g,X,V,x);if(M){for(U=0;U<T;U++){f(D,X*l+U,V*l+U,N)}for(U=0;U<S;U++){f(M,X*v+U,V*v+U,N)}}}}for(X=0;X<S;X++){h[X]=g[X]}if(!M){jsfeat.cache.put_buffer(r);return}for(X=0;X<E;X++){x=X<S?g[X]:0;while(x<=q){y=(1/T);for(U=0;U<T;U++){z=(z*214013+2531011);B=(((z>>16)&32767)&256)!=0?y:-y;D[X*l+U]=B}for(A=0;A<2;A++){for(V=0;V<X;V++){x=0;for(U=0;U<T;U++){x+=D[X*l+U]*D[V*l+U]}o=0;for(U=0;U<T;U++){N=(D[X*l+U]-x*D[V*l+U]);D[X*l+U]=N;o+=Math.abs(N)}o=o?1/o:0;for(U=0;U<T;U++){D[X*l+U]*=o}}}x=0;for(U=0;U<T;U++){N=D[X*l+U];x+=N*N}x=Math.sqrt(x)}O=(1/x);for(U=0;U<T;U++){D[X*l+U]*=O}}jsfeat.cache.put_buffer(r)};return{lu_solve:function(l,g){var q=0,o=0,n=0,h=1,v=l.cols;var w=l.data,r=g.data;var x,m,u,y;for(q=0;q<v;q++){n=q;for(o=q+1;o<v;o++){if(Math.abs(w[o*v+q])>Math.abs(w[n*v+q])){n=o}}if(Math.abs(w[n*v+q])<jsfeat.EPSILON){return 0}if(n!=q){for(o=q;o<v;o++){f(w,q*v+o,n*v+o,x)}f(r,q,n,x);h=-h}u=-1/w[q*v+q];for(o=q+1;o<v;o++){m=w[o*v+q]*u;for(n=q+1;n<v;n++){w[o*v+n]+=m*w[q*v+n]}r[o]+=m*r[q]}w[q*v+q]=-u}for(q=v-1;q>=0;q--){y=r[q];for(n=q+1;n<v;n++){y-=w[q*v+n]*r[n]}r[q]=y*w[q*v+q]}return 1},cholesky_solve:function(h,g){var l=0,v=0,r=0,s=0,n=0,p=0,o=0;var u=h.cols;var t=h.data,q=g.data;var k,m;for(l=0;l<u;l++){m=1;s=(l*u);n=s;for(v=l;v<u;v++){k=t[(n+l)];for(r=0;r<l;r++){k-=t[(r*u+l)]*t[(n+r)]}if(v==l){t[(n+l)]=k;if(k==0){return 0}m=1/k}else{t[(s+v)]=k;t[(n+l)]=k*m}n=(n+u)}}s=0;for(p=0;p<u;p++){k=q[p];for(o=0;o<p;o++){k-=t[(s+o)]*q[o]}q[p]=k;s=(s+u)}s=0;for(p=0;p<u;p++){q[p]/=t[(s+p)];s=(s+u)}p=(u-1);for(;p>=0;p--){k=q[p];o=(p+1);s=(o*u);for(;o<u;o++){k-=t[(s+p)]*q[o];s=(s+u)}q[p]=k}return 1},svd_decompose:function(t,k,p,l,o){if(typeof o==="undefined"){o=0}var r=0,z=0,x=0,g=t.rows,D=t.cols,w=g,v=D;var s=t.type|jsfeat.C1_t;if(w<v){r=1;z=w;w=v;v=z}var q=jsfeat.cache.get_buffer((w*w)<<3);var h=jsfeat.cache.get_buffer(v<<3);var C=jsfeat.cache.get_buffer((v*v)<<3);var u=new jsfeat.matrix_t(w,w,s,q.data);var B=new jsfeat.matrix_t(1,v,s,h.data);var y=new jsfeat.matrix_t(v,v,s,C.data);if(r==0){jsfeat.matmath.transpose(u,t)}else{for(z=0;z<D*g;z++){u.data[z]=t.data[z]}for(;z<v*w;z++){u.data[z]=0}}e(u.data,w,B.data,y.data,v,w,v,w);if(k){for(z=0;z<v;z++){k.data[z]=B.data[z]}for(;z<D;z++){k.data[z]=0}}if(r==0){if(p&&(o&jsfeat.SVD_U_T)){z=w*w;while(--z>=0){p.data[z]=u.data[z]}}else{if(p){jsfeat.matmath.transpose(p,u)}}if(l&&(o&jsfeat.SVD_V_T)){z=v*v;while(--z>=0){l.data[z]=y.data[z]}}else{if(l){jsfeat.matmath.transpose(l,y)}}}else{if(p&&(o&jsfeat.SVD_U_T)){z=v*v;while(--z>=0){p.data[z]=y.data[z]}}else{if(p){jsfeat.matmath.transpose(p,y)}}if(l&&(o&jsfeat.SVD_V_T)){z=w*w;while(--z>=0){l.data[z]=u.data[z]}}else{if(l){jsfeat.matmath.transpose(l,u)}}}jsfeat.cache.put_buffer(q);jsfeat.cache.put_buffer(h);jsfeat.cache.put_buffer(C)},svd_solve:function(v,l,s){var E=0,C=0,z=0;var w=0,u=0;var o=v.rows,p=v.cols;var h=0,I=0,x=0;var r=v.type|jsfeat.C1_t;var F=jsfeat.cache.get_buffer((o*o)<<3);var m=jsfeat.cache.get_buffer(p<<3);var H=jsfeat.cache.get_buffer((p*p)<<3);var t=new jsfeat.matrix_t(o,o,r,F.data);var G=new jsfeat.matrix_t(1,p,r,m.data);var D=new jsfeat.matrix_t(p,p,r,H.data);var n=s.data,y=t.data,q=G.data,g=D.data;this.svd_decompose(v,G,t,D,0);x=jsfeat.EPSILON*q[0]*p;for(;E<p;E++,u+=p){I=0;for(C=0;C<p;C++){if(q[C]>x){for(z=0,h=0,w=0;z<o;z++,w+=p){h+=y[w+C]*n[z]}I+=h*g[u+C]/q[C]}}l.data[E]=I}jsfeat.cache.put_buffer(F);jsfeat.cache.put_buffer(m);jsfeat.cache.put_buffer(H)},svd_invert:function(E,t){var C=0,z=0,y=0;var v=0,s=0,h=0;var n=t.rows,o=t.cols;var l=0,w=0;var q=t.type|jsfeat.C1_t;var D=jsfeat.cache.get_buffer((n*n)<<3);var m=jsfeat.cache.get_buffer(o<<3);var G=jsfeat.cache.get_buffer((o*o)<<3);var u=new jsfeat.matrix_t(n,n,q,D.data);var F=new jsfeat.matrix_t(1,o,q,m.data);var B=new jsfeat.matrix_t(o,o,q,G.data);var r=E.data,x=u.data,p=F.data,g=B.data;this.svd_decompose(t,F,u,B,0);w=jsfeat.EPSILON*p[0]*o;for(;C<o;C++,s+=o){for(z=0,v=0;z<n;z++,h++){for(y=0,l=0;y<o;y++,v++){if(p[y]>w){l+=g[s+y]*x[v]/p[y]}}r[h]=l}}jsfeat.cache.put_buffer(D);jsfeat.cache.put_buffer(m);jsfeat.cache.put_buffer(G)},eigenVV:function(j,p,r){var k=j.cols,m=k*k;var g=j.type|jsfeat.C1_t;var o=jsfeat.cache.get_buffer((k*k)<<3);var h=jsfeat.cache.get_buffer(k<<3);var l=new jsfeat.matrix_t(k,k,g,o.data);var q=new jsfeat.matrix_t(1,k,g,h.data);while(--m>=0){l.data[m]=j.data[m]}c(l.data,k,q.data,p?p.data:null,k,k);if(r){while(--k>=0){r.data[k]=q.data[k]}}jsfeat.cache.put_buffer(o);jsfeat.cache.put_buffer(h)}}})();b.linalg=a})(jsfeat);(function(a){var c=(function(){var m=function(p){return p*p};var e=function(z,A,x,w,u){var t=0;var y=0,s=0,q=0,C=0;var v=0,r=0,p=0,B=0;var E=0,D=0;for(;t<u;++t){y+=z[t].x;s+=z[t].y;v+=A[t].x;r+=A[t].y}y/=u;s/=u;v/=u;r/=u;for(t=0;t<u;++t){E=z[t].x-y;D=z[t].y-s;q+=Math.sqrt(E*E+D*D);E=A[t].x-v;D=A[t].y-r;p+=Math.sqrt(E*E+D*D)}q/=u;p/=u;C=Math.SQRT2/q;B=Math.SQRT2/p;x[0]=x[4]=C;x[2]=-y*C;x[5]=-s*C;x[1]=x[3]=x[6]=x[7]=0;x[8]=1;w[0]=w[4]=B;w[2]=-v*B;w[5]=-r*B;w[1]=w[3]=w[6]=w[7]=0;w[8]=1};var h=function(x,u){var q=0,p=0,r=(u-1)|0;var w=0,t=0,v=0,s=0;for(;q<r;++q){w=x[q].x-x[r].x;t=x[q].y-x[r].y;for(p=0;p<q;++p){v=x[p].x-x[r].x;s=x[p].y-x[r].y;if(Math.abs(v*t-s*w)<=jsfeat.EPSILON*(Math.abs(w)+Math.abs(t)+Math.abs(v)+Math.abs(s))){return true}}}return false};var k=new jsfeat.matrix_t(3,3,jsfeat.F32_t|jsfeat.C1_t);var i=new jsfeat.matrix_t(3,3,jsfeat.F32_t|jsfeat.C1_t);var o=new jsfeat.matrix_t(6,6,jsfeat.F32_t|jsfeat.C1_t);var n=new jsfeat.matrix_t(6,1,jsfeat.F32_t|jsfeat.C1_t);var j=(function(){function p(){}p.prototype.run=function(D,q,r,t){var G=0,F=0;var B=r.type|jsfeat.C1_t;var J=r.data,v=k.data,E=i.data;var x,w,A=0,z=0;e(D,q,v,E,t);var u=jsfeat.cache.get_buffer((2*t*6)<<3);var y=jsfeat.cache.get_buffer((2*t)<<3);var C=new jsfeat.matrix_t(6,2*t,B,u.data);var H=new jsfeat.matrix_t(1,2*t,B,y.data);var I=C.data,s=H.data;for(;G<t;++G){x=D[G];w=q[G];A=v[0]*x.x+v[1]*x.y+v[2];z=v[3]*x.x+v[4]*x.y+v[5];F=G*2*6;I[F]=A,I[F+1]=z,I[F+2]=1,I[F+3]=0,I[F+4]=0,I[F+5]=0;F+=6;I[F]=0,I[F+1]=0,I[F+2]=0,I[F+3]=A,I[F+4]=z,I[F+5]=1;s[G<<1]=E[0]*w.x+E[1]*w.y+E[2];s[(G<<1)+1]=E[3]*w.x+E[4]*w.y+E[5]}jsfeat.matmath.multiply_AtA(o,C);jsfeat.matmath.multiply_AtB(n,C,H);jsfeat.linalg.lu_solve(o,n);J[0]=n.data[0],J[1]=n.data[1],J[2]=n.data[2];J[3]=n.data[3],J[4]=n.data[4],J[5]=n.data[5];J[6]=0,J[7]=0,J[8]=1;jsfeat.matmath.invert_3x3(i,i);jsfeat.matmath.multiply_3x3(r,i,r);jsfeat.matmath.multiply_3x3(r,r,k);jsfeat.cache.put_buffer(u);jsfeat.cache.put_buffer(y);return 1};p.prototype.error=function(v,w,t,r,u){var s=0;var y,x;var q=t.data;for(;s<u;++s){y=v[s];x=w[s];r[s]=m(x.x-q[0]*y.x-q[1]*y.y-q[2])+m(x.y-q[3]*y.x-q[4]*y.y-q[5])}};p.prototype.check_subset=function(s,r,q){return true};return p})();var g=new jsfeat.matrix_t(9,9,jsfeat.F32_t|jsfeat.C1_t);var f=new jsfeat.matrix_t(9,9,jsfeat.F32_t|jsfeat.C1_t);var l=(function(){function p(){}p.prototype.run=function(I,r,v,C){var L=0,K=0;var O=v.data,D=k.data,J=i.data;var M=g.data,N=f.data;var H=0,G=0,s=0,q=0;var u=0,t=0,B=0,A=0,z=0,w=0,F=0,E=0;for(;L<C;++L){B+=r[L].x;A+=r[L].y;F+=I[L].x;E+=I[L].y}B/=C;A/=C;F/=C;E/=C;for(L=0;L<C;++L){u+=Math.abs(r[L].x-B);t+=Math.abs(r[L].y-A);z+=Math.abs(I[L].x-F);w+=Math.abs(I[L].y-E)}if(Math.abs(u)<jsfeat.EPSILON||Math.abs(t)<jsfeat.EPSILON||Math.abs(z)<jsfeat.EPSILON||Math.abs(w)<jsfeat.EPSILON){return 0}u=C/u;t=C/t;z=C/z;w=C/w;D[0]=z;D[1]=0;D[2]=-F*z;D[3]=0;D[4]=w;D[5]=-E*w;D[6]=0;D[7]=0;D[8]=1;J[0]=1/u;J[1]=0;J[2]=B;J[3]=0;J[4]=1/t;J[5]=A;J[6]=0;J[7]=0;J[8]=1;L=81;while(--L>=0){M[L]=0}for(L=0;L<C;++L){H=(r[L].x-B)*u;G=(r[L].y-A)*t;s=(I[L].x-F)*z;q=(I[L].y-E)*w;M[0]+=s*s;M[1]+=s*q;M[2]+=s;M[6]+=s*-H*s;M[7]+=s*-H*q;M[8]+=s*-H;M[10]+=q*q;M[11]+=q;M[15]+=q*-H*s;M[16]+=q*-H*q;M[17]+=q*-H;M[20]+=1;M[24]+=-H*s;M[25]+=-H*q;M[26]+=-H;M[30]+=s*s;M[31]+=s*q;M[32]+=s;M[33]+=s*-G*s;M[34]+=s*-G*q;M[35]+=s*-G;M[40]+=q*q;M[41]+=q;M[42]+=q*-G*s;M[43]+=q*-G*q;M[44]+=q*-G;M[50]+=1;M[51]+=-G*s;M[52]+=-G*q;M[53]+=-G;M[60]+=-H*s*-H*s+-G*s*-G*s;M[61]+=-H*s*-H*q+-G*s*-G*q;M[62]+=-H*s*-H+-G*s*-G;M[70]+=-H*q*-H*q+-G*q*-G*q;M[71]+=-H*q*-H+-G*q*-G;M[80]+=-H*-H+-G*-G}for(L=0;L<9;++L){for(K=0;K<L;++K){M[L*9+K]=M[K*9+L]}}jsfeat.linalg.eigenVV(g,f);O[0]=N[72],O[1]=N[73],O[2]=N[74];O[3]=N[75],O[4]=N[76],O[5]=N[77];O[6]=N[78],O[7]=N[79],O[8]=N[80];jsfeat.matmath.multiply_3x3(v,i,v);jsfeat.matmath.multiply_3x3(v,v,k);H=1/O[8];O[0]*=H;O[1]*=H;O[2]*=H;O[3]*=H;O[4]*=H;O[5]*=H;O[6]*=H;O[7]*=H;O[8]=1;return 1};p.prototype.error=function(w,x,u,r,v){var t=0;var z,y,s=0,B=0,A=0;var q=u.data;for(;t<v;++t){z=w[t];y=x[t];s=1/(q[6]*z.x+q[7]*z.y+1);B=(q[0]*z.x+q[1]*z.y+q[2])*s-y.x;A=(q[3]*z.x+q[4]*z.y+q[5])*s-y.y;r[t]=(B*B+A*A)}};p.prototype.check_subset=function(M,s,B){if(B==4){var N=0;var I=M[0],H=M[1],G=M[2],E=M[3];var A=s[0],y=s[1],w=s[2],u=s[3];var L=I.x,K=I.y,J=1;var V=H.x,U=H.y,T=1;var z=G.x,x=G.y,v=1;var t=A.x,r=A.y,q=1;var F=y.x,D=y.y,C=1;var Q=w.x,P=w.y,O=1;var S=jsfeat.matmath.determinant_3x3(L,K,J,V,U,T,z,x,v);var R=jsfeat.matmath.determinant_3x3(t,r,q,F,D,C,Q,P,O);if(S*R<0){N++}L=H.x,K=H.y;V=G.x,U=G.y;z=E.x,x=E.y;t=y.x,r=y.y;F=w.x,D=w.y;Q=u.x,P=u.y;S=jsfeat.matmath.determinant_3x3(L,K,J,V,U,T,z,x,v);R=jsfeat.matmath.determinant_3x3(t,r,q,F,D,C,Q,P,O);if(S*R<0){N++}L=I.x,K=I.y;V=G.x,U=G.y;z=E.x,x=E.y;t=A.x,r=A.y;F=w.x,D=w.y;Q=u.x,P=u.y;S=jsfeat.matmath.determinant_3x3(L,K,J,V,U,T,z,x,v);R=jsfeat.matmath.determinant_3x3(t,r,q,F,D,C,Q,P,O);if(S*R<0){N++}L=I.x,K=I.y;V=H.x,U=H.y;z=E.x,x=E.y;t=A.x,r=A.y;F=y.x,D=y.y;Q=u.x,P=u.y;S=jsfeat.matmath.determinant_3x3(L,K,J,V,U,T,z,x,v);R=jsfeat.matmath.determinant_3x3(t,r,q,F,D,C,Q,P,O);if(S*R<0){N++}if(N!=0&&N!=4){return false}}return true};return p})();return{affine2d:j,homography2d:l}})();var b=(function(){function e(h,i,f,g){if(typeof h==="undefined"){h=0}if(typeof i==="undefined"){i=0.5}if(typeof f==="undefined"){f=0.5}if(typeof g==="undefined"){g=0.99}this.size=h;this.thresh=i;this.eps=f;this.prob=g}e.prototype.update_iters=function(g,i){var h=Math.log(1-this.prob);var f=Math.log(1-Math.pow(1-g,this.size));return(f>=0||-h>=i*(-f)?i:Math.round(h/f))|0};return e})();var d=(function(){var e=function(l,q,r,p,t,m,g){var v=1000;var s=[];var n=0,k=0,u=0,h=0,o=false;for(;u<v;++u){n=0;for(;n<p&&u<v;){o=false;h=0;while(!o){o=true;h=s[n]=Math.floor(Math.random()*t)|0;for(k=0;k<n;++k){if(h==s[k]){o=false;break}}}m[n]=q[h];g[n]=r[h];if(!l.check_subset(m,g,n+1)){u++;continue}++n}break}return(n==p&&u<v)};var f=function(k,m,p,q,o,g,h,s){var j=0,l=0,n=0;var r=g*g;k.error(p,q,m,h,o);for(;l<o;++l){n=h[l]<=r;s[l]=n;j+=n}return j};return{ransac:function(E,m,x,i,l,j,y,g){if(typeof g==="undefined"){g=1000}if(l<E.size){return false}var v=E.size;var A=g,z=0;var q=false;var D=[];var C=[];var r=false;var G=j.cols,w=j.rows;var u=j.type|jsfeat.C1_t;var B=jsfeat.cache.get_buffer((G*w)<<3);var h=jsfeat.cache.get_buffer(l);var t=jsfeat.cache.get_buffer(l<<2);var o=new jsfeat.matrix_t(G,w,u,B.data);var s=new jsfeat.matrix_t(l,1,jsfeat.U8C1_t,h.data);var F=-1,p=0;var n=0;var k=t.f32;if(l==v){if(m.run(x,i,o,l)<=0){jsfeat.cache.put_buffer(B);jsfeat.cache.put_buffer(h);jsfeat.cache.put_buffer(t);return false}o.copy_to(j);if(y){while(--l>=0){y.data[l]=1}}jsfeat.cache.put_buffer(B);jsfeat.cache.put_buffer(h);jsfeat.cache.put_buffer(t);return true}for(;z<A;++z){r=e(m,x,i,v,l,D,C);if(!r){if(z==0){jsfeat.cache.put_buffer(B);jsfeat.cache.put_buffer(h);jsfeat.cache.put_buffer(t);return false}break}n=m.run(D,C,o,v);if(n<=0){continue}p=f(m,o,x,i,l,E.thresh,k,s.data);if(p>Math.max(F,v-1)){o.copy_to(j);F=p;if(y){s.copy_to(y)}A=E.update_iters((l-p)/l,A);q=true}}jsfeat.cache.put_buffer(B);jsfeat.cache.put_buffer(h);jsfeat.cache.put_buffer(t);return q},lmeds:function(H,n,z,i,l,j,B,g){if(typeof g==="undefined"){g=1000}if(l<H.size){return false}var w=H.size;var D=g,C=0;var r=false;var G=[];var F=[];var s=false;var I=j.cols,y=j.rows;var v=j.type|jsfeat.C1_t;var E=jsfeat.cache.get_buffer((I*y)<<3);var h=jsfeat.cache.get_buffer(l);var u=jsfeat.cache.get_buffer(l<<2);var p=new jsfeat.matrix_t(I,y,v,E.data);var t=new jsfeat.matrix_t(l,1,jsfeat.U8_t|jsfeat.C1_t,h.data);var q=0;var o=0;var k=u.f32;var A=1000000000,x=0,m=0;H.eps=0.45;D=H.update_iters(H.eps,D);if(l==w){if(n.run(z,i,p,l)<=0){jsfeat.cache.put_buffer(E);jsfeat.cache.put_buffer(h);jsfeat.cache.put_buffer(u);return false}p.copy_to(j);if(B){while(--l>=0){B.data[l]=1}}jsfeat.cache.put_buffer(E);jsfeat.cache.put_buffer(h);jsfeat.cache.put_buffer(u);return true}for(;C<D;++C){s=e(n,z,i,w,l,G,F);if(!s){if(C==0){jsfeat.cache.put_buffer(E);jsfeat.cache.put_buffer(h);jsfeat.cache.put_buffer(u);return false}break}o=n.run(G,F,p,w);if(o<=0){continue}n.error(z,i,p,k,l);m=jsfeat.math.median(k,0,l-1);if(m<A){A=m;p.copy_to(j);r=true}}if(r){x=2.5*1.4826*(1+5/(l-w))*Math.sqrt(A);x=Math.max(x,0.001);q=f(n,j,z,i,l,x,k,t.data);if(B){t.copy_to(B)}r=q>=w}jsfeat.cache.put_buffer(E);jsfeat.cache.put_buffer(h);jsfeat.cache.put_buffer(u);return r}}})();a.ransac_params_t=b;a.motion_model=c;a.motion_estimator=d})(jsfeat);(function(b){var a=(function(){var c=function(q,S,O,p){var r=0;var y=q.channel,v=q.cols,J=q.rows;var P=q.data,m=S.data;var I=v/O,H=J/p;var n=(I*H*65536)|0;var x=0,u=0,C=0,A=0,t=0,s=0,G=0,F=0,D=0,B=0;var Q=0,N=0,K=0,o=0,M=0,E=0;var l=jsfeat.cache.get_buffer((O*y)<<2);var g=jsfeat.cache.get_buffer((O*y)<<2);var R=jsfeat.cache.get_buffer((v*2*3)<<2);var L=l.i32;var j=g.i32;var z=R.i32;for(;x<O;x++){D=x*I,B=D+I;t=(D+1-0.000001)|0,s=B|0;t=Math.min(t,v-1);s=Math.min(s,v-1);if(t>D){z[F++]=(x*y)|0;z[F++]=((t-1)*y)|0;z[F++]=((t-D)*256)|0;r++}for(C=t;C<s;C++){r++;z[F++]=(x*y)|0;z[F++]=(C*y)|0;z[F++]=256}if(B-s>0.001){r++;z[F++]=(x*y)|0;z[F++]=(s*y)|0;z[F++]=((B-s)*256)|0}}for(x=0;x<O*y;x++){L[x]=j[x]=0}u=0;for(A=0;A<J;A++){Q=v*A;for(F=0;F<r;F++){K=z[F*3];t=z[F*3+1];o=z[F*3+2];for(G=0;G<y;G++){L[K+G]+=P[Q+t+G]*o}}if((u+1)*H<=A+1||A==J-1){M=(Math.max(A+1-(u+1)*H,0)*256)|0;E=256-M;N=O*u;if(M<=0){for(x=0;x<O*y;x++){m[N+x]=Math.min(Math.max((j[x]+L[x]*256)/n,0),255);j[x]=L[x]=0}}else{for(x=0;x<O*y;x++){m[N+x]=Math.min(Math.max((j[x]+L[x]*E)/n,0),255);j[x]=L[x]*M;L[x]=0}}u++}else{for(x=0;x<O*y;x++){j[x]+=L[x]*256;L[x]=0}}}jsfeat.cache.put_buffer(g);jsfeat.cache.put_buffer(l);jsfeat.cache.put_buffer(R)};var f=function(p,S,N,o){var q=0;var x=p.channel,u=p.cols,I=p.rows;var O=p.data,m=S.data;var H=u/N,G=I/o;var Q=1/(H*G);var v=0,t=0,B=0,z=0,s=0,r=0,F=0,E=0,C=0,A=0;var P=0,M=0,J=0,n=0,L=0,D=0;var l=jsfeat.cache.get_buffer((N*x)<<2);var g=jsfeat.cache.get_buffer((N*x)<<2);var R=jsfeat.cache.get_buffer((u*2*3)<<2);var K=l.f32;var j=g.f32;var y=R.f32;for(;v<N;v++){C=v*H,A=C+H;s=(C+1-0.000001)|0,r=A|0;s=Math.min(s,u-1);r=Math.min(r,u-1);if(s>C){q++;y[E++]=((s-1)*x)|0;y[E++]=(v*x)|0;y[E++]=(s-C)*Q}for(B=s;B<r;B++){q++;y[E++]=(B*x)|0;y[E++]=(v*x)|0;y[E++]=Q}if(A-r>0.001){q++;y[E++]=(r*x)|0;y[E++]=(v*x)|0;y[E++]=(A-r)*Q}}for(v=0;v<N*x;v++){K[v]=j[v]=0}t=0;for(z=0;z<I;z++){P=u*z;for(E=0;E<q;E++){s=y[E*3]|0;J=y[E*3+1]|0;n=y[E*3+2];for(F=0;F<x;F++){K[J+F]+=O[P+s+F]*n}}if((t+1)*G<=z+1||z==I-1){L=Math.max(z+1-(t+1)*G,0);D=1-L;M=N*t;if(Math.abs(L)<0.001){for(v=0;v<N*x;v++){m[M+v]=j[v]+K[v];j[v]=K[v]=0}}else{for(v=0;v<N*x;v++){m[M+v]=j[v]+K[v]*D;j[v]=K[v]*L;K[v]=0}}t++}else{for(v=0;v<N*x;v++){j[v]+=K[v];K[v]=0}}}jsfeat.cache.put_buffer(g);jsfeat.cache.put_buffer(l);jsfeat.cache.put_buffer(R)};var e=function(D,F,m,s,B,t,g,n){var z=0,y=0,x=0,A=0,u=0,l=0,G=0,E=0,C=0,v=t[0],r=0;var q=s<<1,p=s*3,o=s<<2;for(;z<B;++z){l=F[A];for(y=0;y<n;++y){D[y]=l}for(y=0;y<=s-2;y+=2){D[y+n]=F[A+y];D[y+n+1]=F[A+y+1]}for(;y<s;++y){D[y+n]=F[A+y]}l=F[A+s-1];for(y=s;y<n+s;++y){D[y+n]=l}for(y=0;y<=s-4;y+=4){l=D[y]*v,G=D[y+1]*v,E=D[y+2]*v,C=D[y+3]*v;for(x=1;x<g;++x){r=t[x];l+=D[x+y]*r;G+=D[x+y+1]*r;E+=D[x+y+2]*r;C+=D[x+y+3]*r}m[u+y]=Math.min(l>>8,255);m[u+y+1]=Math.min(G>>8,255);m[u+y+2]=Math.min(E>>8,255);m[u+y+3]=Math.min(C>>8,255)}for(;y<s;++y){l=D[y]*v;for(x=1;x<g;++x){l+=D[x+y]*t[x]}m[u+y]=Math.min(l>>8,255)}A+=s;u+=s}for(z=0;z<s;++z){l=m[z];for(y=0;y<n;++y){D[y]=l}x=z;for(y=0;y<=B-2;y+=2,x+=q){D[y+n]=m[x];D[y+n+1]=m[x+s]}for(;y<B;++y,x+=s){D[y+n]=m[x]}l=m[(B-1)*s+z];for(y=B;y<n+B;++y){D[y+n]=l}u=z;for(y=0;y<=B-4;y+=4,u+=o){l=D[y]*v,G=D[y+1]*v,E=D[y+2]*v,C=D[y+3]*v;for(x=1;x<g;++x){r=t[x];l+=D[x+y]*r;G+=D[x+y+1]*r;E+=D[x+y+2]*r;C+=D[x+y+3]*r}m[u]=Math.min(l>>8,255);m[u+s]=Math.min(G>>8,255);m[u+q]=Math.min(E>>8,255);m[u+p]=Math.min(C>>8,255)}for(;y<B;++y,u+=s){l=D[y]*v;for(x=1;x<g;++x){l+=D[x+y]*t[x]}m[u]=Math.min(l>>8,255)}}};var d=function(D,F,m,s,B,t,g,n){var z=0,y=0,x=0,A=0,u=0,l=0,G=0,E=0,C=0,v=t[0],r=0;var q=s<<1,p=s*3,o=s<<2;for(;z<B;++z){l=F[A];for(y=0;y<n;++y){D[y]=l}for(y=0;y<=s-2;y+=2){D[y+n]=F[A+y];D[y+n+1]=F[A+y+1]}for(;y<s;++y){D[y+n]=F[A+y]}l=F[A+s-1];for(y=s;y<n+s;++y){D[y+n]=l}for(y=0;y<=s-4;y+=4){l=D[y]*v,G=D[y+1]*v,E=D[y+2]*v,C=D[y+3]*v;for(x=1;x<g;++x){r=t[x];l+=D[x+y]*r;G+=D[x+y+1]*r;E+=D[x+y+2]*r;C+=D[x+y+3]*r}m[u+y]=l;m[u+y+1]=G;m[u+y+2]=E;m[u+y+3]=C}for(;y<s;++y){l=D[y]*v;for(x=1;x<g;++x){l+=D[x+y]*t[x]}m[u+y]=l}A+=s;u+=s}for(z=0;z<s;++z){l=m[z];for(y=0;y<n;++y){D[y]=l}x=z;for(y=0;y<=B-2;y+=2,x+=q){D[y+n]=m[x];D[y+n+1]=m[x+s]}for(;y<B;++y,x+=s){D[y+n]=m[x]}l=m[(B-1)*s+z];for(y=B;y<n+B;++y){D[y+n]=l}u=z;for(y=0;y<=B-4;y+=4,u+=o){l=D[y]*v,G=D[y+1]*v,E=D[y+2]*v,C=D[y+3]*v;for(x=1;x<g;++x){r=t[x];l+=D[x+y]*r;G+=D[x+y+1]*r;E+=D[x+y+2]*r;C+=D[x+y+3]*r}m[u]=l;m[u+s]=G;m[u+q]=E;m[u+p]=C}for(;y<B;++y,u+=s){l=D[y]*v;for(x=1;x<g;++x){l+=D[x+y]*t[x]}m[u]=l}}};return{grayscale:function(n,r,A,D,g){if(typeof g==="undefined"){g=jsfeat.COLOR_RGBA2GRAY}var q=0,p=0,z=0,v=0,m=0,u=0;var s=4899,B=9617,C=1868,o=4;if(g==jsfeat.COLOR_BGRA2GRAY||g==jsfeat.COLOR_BGR2GRAY){s=1868;C=4899}if(g==jsfeat.COLOR_RGB2GRAY||g==jsfeat.COLOR_BGR2GRAY){o=3}var l=o<<1,k=(o*3)|0;D.resize(r,A,1);var t=D.data;for(p=0;p<A;++p,v+=r,z+=r*o){for(q=0,m=z,u=v;q<=r-4;q+=4,m+=o<<2,u+=4){t[u]=(n[m]*s+n[m+1]*B+n[m+2]*C+8192)>>14;t[u+1]=(n[m+o]*s+n[m+o+1]*B+n[m+o+2]*C+8192)>>14;t[u+2]=(n[m+l]*s+n[m+l+1]*B+n[m+l+2]*C+8192)>>14;t[u+3]=(n[m+k]*s+n[m+k+1]*B+n[m+k+2]*C+8192)>>14}for(;q<r;++q,++u,m+=o){t[u]=(n[m]*s+n[m+1]*B+n[m+2]*C+8192)>>14}}},resample:function(l,m,i,k){var j=l.rows,g=l.cols;if(j>k&&g>i){m.resize(i,k,l.channel);if(l.type&jsfeat.U8_t&&m.type&jsfeat.U8_t&&j*g/(k*i)<256){c(l,m,i,k)}else{f(l,m,i,k)}}},box_blur_gray:function(r,J,n,l){if(typeof l==="undefined"){l=0}var z=r.cols,E=r.rows,s=E<<1,v=z<<1;var D=0,u=0,t=0,m=0;var B=((n<<1)+1)|0;var p=(n+1)|0,H=(p+1)|0;var I=l&jsfeat.BOX_BLUR_NOSCALE?1:(1/(B*B));var C=jsfeat.cache.get_buffer((z*E)<<2);var j=0,G=0,o=0,q=0,k=0;var F=C.i32;var g=r.data;var A=0;J.resize(z,E,r.channel);for(t=0;t<E;++t){G=t;j=p*g[o];for(D=(o+1)|0,m=(o+n)|0;D<=m;++D){j+=g[D]}q=(o+p)|0;k=o;A=g[k];for(u=0;u<n;++u,G+=E){F[G]=j;j+=g[q]-A;q++}for(;u<z-H;u+=2,G+=s){F[G]=j;j+=g[q]-g[k];F[G+E]=j;j+=g[q+1]-g[k+1];q+=2;k+=2}for(;u<z-p;++u,G+=E){F[G]=j;j+=g[q]-g[k];q++;k++}A=g[q-1];for(;u<z;++u,G+=E){F[G]=j;j+=A-g[k];k++}o+=z}o=0;g=J.data;if(I==1){for(t=0;t<z;++t){G=t;j=p*F[o];for(D=(o+1)|0,m=(o+n)|0;D<=m;++D){j+=F[D]}q=o+p;k=o;A=F[k];for(u=0;u<n;++u,G+=z){g[G]=j;j+=F[q]-A;q++}for(;u<E-H;u+=2,G+=v){g[G]=j;j+=F[q]-F[k];g[G+z]=j;j+=F[q+1]-F[k+1];q+=2;k+=2}for(;u<E-p;++u,G+=z){g[G]=j;j+=F[q]-F[k];q++;k++}A=F[q-1];for(;u<E;++u,G+=z){g[G]=j;j+=A-F[k];k++}o+=E}}else{for(t=0;t<z;++t){G=t;j=p*F[o];for(D=(o+1)|0,m=(o+n)|0;D<=m;++D){j+=F[D]}q=o+p;k=o;A=F[k];for(u=0;u<n;++u,G+=z){g[G]=j*I;j+=F[q]-A;q++}for(;u<E-H;u+=2,G+=v){g[G]=j*I;j+=F[q]-F[k];g[G+z]=j*I;j+=F[q+1]-F[k+1];q+=2;k+=2}for(;u<E-p;++u,G+=z){g[G]=j*I;j+=F[q]-F[k];q++;k++}A=F[q-1];for(;u<E;++u,G+=z){g[G]=j*I;j+=A-F[k];k++}o+=E}}jsfeat.cache.put_buffer(C)},gaussian_blur:function(g,s,r,v){if(typeof v==="undefined"){v=0}if(typeof r==="undefined"){r=0}r=r==0?(Math.max(1,(4*v+1-1e-8))*2+1)|0:r;var x=r>>1;var t=g.cols,p=g.rows;var u=g.type,n=u&jsfeat.U8_t;s.resize(t,p,g.channel);var m=g.data,j=s.data;var k,i,q=(r+Math.max(p,t))|0;var l=jsfeat.cache.get_buffer(q<<2);var o=jsfeat.cache.get_buffer(r<<2);if(n){k=l.i32;i=o.i32}else{if(u&jsfeat.S32_t){k=l.i32;i=o.f32}else{k=l.f32;i=o.f32}}jsfeat.math.get_gaussian_kernel(r,v,i,u);if(n){e(k,m,j,t,p,i,r,x)}else{d(k,m,j,t,p,i,r,x)}jsfeat.cache.put_buffer(l);jsfeat.cache.put_buffer(o)},pyrdown:function(k,A,s,r){if(typeof s==="undefined"){s=0}if(typeof r==="undefined"){r=0}var q=k.cols,t=k.rows;var p=q>>1,l=t>>1;var B=p-(s<<1),u=l-(r<<1);var o=0,n=0,g=s+r*q,m=0,v=0,i=0;A.resize(p,l,k.channel);var z=k.data,j=A.data;for(n=0;n<u;++n){m=g;i=v;for(o=0;o<=B-2;o+=2,i+=2,m+=4){j[i]=(z[m]+z[m+1]+z[m+q]+z[m+q+1]+2)>>2;j[i+1]=(z[m+2]+z[m+3]+z[m+q+2]+z[m+q+3]+2)>>2}for(;o<B;++o,++i,m+=2){j[i]=(z[m]+z[m+1]+z[m+q]+z[m+q+1]+2)>>2}g+=q<<1;v+=p}},scharr_derivatives:function(j,G){var p=j.cols,s=j.rows;var H=p<<1,o=0,m=0,u=0,E,D,C,B,A,z;var v=0,t=0,r=0,i=0;var n,l;G.resize(p,s,2);var F=j.data,g=G.data;var k=jsfeat.cache.get_buffer((p+2)<<2);var q=jsfeat.cache.get_buffer((p+2)<<2);if(j.type&jsfeat.U8_t||j.type&jsfeat.S32_t){n=k.i32;l=q.i32}else{n=k.f32;l=q.f32}for(;m<s;++m,t+=p){v=((m>0?m-1:1)*p)|0;r=((m<s-1?m+1:s-2)*p)|0;i=(m*H)|0;for(o=0,u=1;o<=p-2;o+=2,u+=2){E=F[v+o],D=F[r+o];n[u]=((E+D)*3+(F[t+o])*10);l[u]=(D-E);E=F[v+o+1],D=F[r+o+1];n[u+1]=((E+D)*3+(F[t+o+1])*10);l[u+1]=(D-E)}for(;o<p;++o,++u){E=F[v+o],D=F[r+o];n[u]=((E+D)*3+(F[t+o])*10);l[u]=(D-E)}o=(p+1)|0;n[0]=n[1];n[o]=n[p];l[0]=l[1];l[o]=l[p];for(o=0;o<=p-4;o+=4){E=l[o+2],D=l[o+1],C=l[o+3],B=l[o+4],A=n[o+2],z=n[o+3];g[i++]=(A-n[o]);g[i++]=((E+l[o])*3+D*10);g[i++]=(z-n[o+1]);g[i++]=((C+D)*3+E*10);g[i++]=((n[o+4]-A));g[i++]=(((B+E)*3+C*10));g[i++]=((n[o+5]-z));g[i++]=(((l[o+5]+C)*3+B*10))}for(;o<p;++o){g[i++]=((n[o+2]-n[o]));g[i++]=(((l[o+2]+l[o])*3+l[o+1]*10))}}jsfeat.cache.put_buffer(k);jsfeat.cache.put_buffer(q)},sobel_derivatives:function(j,G){var p=j.cols,s=j.rows;var H=p<<1,o=0,m=0,u=0,E,D,C,B,A,z;var v=0,t=0,r=0,i=0;var n,l;G.resize(p,s,2);var F=j.data,g=G.data;var k=jsfeat.cache.get_buffer((p+2)<<2);var q=jsfeat.cache.get_buffer((p+2)<<2);if(j.type&jsfeat.U8_t||j.type&jsfeat.S32_t){n=k.i32;l=q.i32}else{n=k.f32;l=q.f32}for(;m<s;++m,t+=p){v=((m>0?m-1:1)*p)|0;r=((m<s-1?m+1:s-2)*p)|0;i=(m*H)|0;for(o=0,u=1;o<=p-2;o+=2,u+=2){E=F[v+o],D=F[r+o];n[u]=((E+D)+(F[t+o]*2));l[u]=(D-E);E=F[v+o+1],D=F[r+o+1];n[u+1]=((E+D)+(F[t+o+1]*2));l[u+1]=(D-E)}for(;o<p;++o,++u){E=F[v+o],D=F[r+o];n[u]=((E+D)+(F[t+o]*2));l[u]=(D-E)}o=(p+1)|0;n[0]=n[1];n[o]=n[p];l[0]=l[1];l[o]=l[p];for(o=0;o<=p-4;o+=4){E=l[o+2],D=l[o+1],C=l[o+3],B=l[o+4],A=n[o+2],z=n[o+3];g[i++]=(A-n[o]);g[i++]=(E+l[o]+D*2);g[i++]=(z-n[o+1]);g[i++]=(C+D+E*2);g[i++]=(n[o+4]-A);g[i++]=(B+E+C*2);g[i++]=(n[o+5]-z);g[i++]=(l[o+5]+C+B*2)}for(;o<p;++o){g[i++]=(n[o+2]-n[o]);g[i++]=(l[o+2]+l[o]+l[o+1]*2)}}jsfeat.cache.put_buffer(k);jsfeat.cache.put_buffer(q)},compute_integral_image:function(g,l,y,u){var t=g.cols|0,w=g.rows|0,o=g.data;var r=(t+1)|0;var B=0,z=0,h=0,x=0,q=0,n=0,A=0,m=0;if(l&&y){for(;q<r;++q){l[q]=0,y[q]=0}h=(r+1)|0,x=1;for(q=0,m=0;q<w;++q,++h,++x){B=z=0;for(n=0;n<=t-2;n+=2,m+=2,h+=2,x+=2){A=o[m];B+=A,z+=A*A;l[h]=l[x]+B;y[h]=y[x]+z;A=o[m+1];B+=A,z+=A*A;l[h+1]=l[x+1]+B;y[h+1]=y[x+1]+z}for(;n<t;++n,++m,++h,++x){A=o[m];B+=A,z+=A*A;l[h]=l[x]+B;y[h]=y[x]+z}}}else{if(l){for(;q<r;++q){l[q]=0}h=(r+1)|0,x=1;for(q=0,m=0;q<w;++q,++h,++x){B=0;for(n=0;n<=t-2;n+=2,m+=2,h+=2,x+=2){B+=o[m];l[h]=l[x]+B;B+=o[m+1];l[h+1]=l[x+1]+B}for(;n<t;++n,++m,++h,++x){B+=o[m];l[h]=l[x]+B}}}else{if(y){for(;q<r;++q){y[q]=0}h=(r+1)|0,x=1;for(q=0,m=0;q<w;++q,++h,++x){z=0;for(n=0;n<=t-2;n+=2,m+=2,h+=2,x+=2){A=o[m];z+=A*A;y[h]=y[x]+z;A=o[m+1];z+=A*A;y[h+1]=y[x+1]+z}for(;n<t;++n,++m,++h,++x){A=o[m];z+=A*A;y[h]=y[x]+z}}}}}if(u){for(q=0;q<r;++q){u[q]=0}h=(r+1)|0,x=0;for(q=0,m=0;q<w;++q,++h,++x){for(n=0;n<=t-2;n+=2,m+=2,h+=2,x+=2){u[h]=o[m]+u[x];u[h+1]=o[m+1]+u[x+1]}for(;n<t;++n,++m,++h,++x){u[h]=o[m]+u[x]}}h=(r+t)|0,x=t;for(q=0;q<w;++q,h+=r,x+=r){u[h]+=u[x]}for(n=t-1;n>0;--n){h=n+w*r,x=h-r;for(q=w;q>0;--q,h-=r,x-=r){u[h]+=u[x]+u[x+1]}}}},equalize_histogram:function(j,r){var s=j.cols,q=j.rows,o=j.data;r.resize(s,q,j.channel);var l=r.data,t=s*q;var p=0,n=0,k,g;var m=jsfeat.cache.get_buffer(256<<2);k=m.i32;for(;p<256;++p){k[p]=0}for(p=0;p<t;++p){++k[o[p]]}n=k[0];for(p=1;p<256;++p){n=k[p]+=n}g=255/t;for(p=0;p<t;++p){l[p]=(k[o[p]]*g+0.5)|0}jsfeat.cache.put_buffer(m)},canny:function(u,V,E,k){var C=u.cols,L=u.rows,S=u.data;V.resize(C,L,u.channel);var o=V.data;var K=0,H=0,q=0,A=C<<1,R=0,J=0,N=0,z=0,v=0,D=0;var g=0,U=0;var p=jsfeat.cache.get_buffer((L*A)<<2);var m=jsfeat.cache.get_buffer((3*(C+2))<<2);var n=jsfeat.cache.get_buffer(((L+2)*(C+2))<<2);var t=jsfeat.cache.get_buffer((L*C)<<2);var Q=m.i32;var T=n.i32;var r=t.i32;var G=p.i32;var l=new jsfeat.matrix_t(C,L,jsfeat.S32C2_t,p.data);var P=1,O=(C+2+1)|0,M=(2*(C+2)+1)|0,B=(C+2)|0,I=(B+1)|0,F=0;this.sobel_derivatives(u,l);if(E>k){K=E;E=k;k=K}K=(3*(C+2))|0;while(--K>=0){Q[K]=0}K=((L+2)*(C+2))|0;while(--K>=0){T[K]=0}for(;H<C;++H,q+=2){z=G[q],v=G[q+1];Q[O+H]=((z^(z>>31))-(z>>31))+((v^(v>>31))-(v>>31))}for(K=1;K<=L;++K,q+=A){if(K==L){H=M+C;while(--H>=M){Q[H]=0}}else{for(H=0;H<C;H++){z=G[q+(H<<1)],v=G[q+(H<<1)+1];Q[M+H]=((z^(z>>31))-(z>>31))+((v^(v>>31))-(v>>31))}}R=(q-A)|0;T[I-1]=0;J=0;for(H=0;H<C;++H,R+=2){N=Q[O+H];if(N>E){z=G[R];v=G[R+1];D=z^v;z=((z^(z>>31))-(z>>31))|0;v=((v^(v>>31))-(v>>31))|0;g=z*13573;U=g+((z+z)<<15);v<<=15;if(v<g){if(N>Q[O+H-1]&&N>=Q[O+H+1]){if(N>k&&!J&&T[I+H-B]!=2){T[I+H]=2;J=1;r[F++]=I+H}else{T[I+H]=1}continue}}else{if(v>U){if(N>Q[P+H]&&N>=Q[M+H]){if(N>k&&!J&&T[I+H-B]!=2){T[I+H]=2;J=1;r[F++]=I+H}else{T[I+H]=1}continue}}else{D=D<0?-1:1;if(N>Q[P+H-D]&&N>Q[M+H+D]){if(N>k&&!J&&T[I+H-B]!=2){T[I+H]=2;J=1;r[F++]=I+H}else{T[I+H]=1}continue}}}}T[I+H]=0;J=0}T[I+C]=0;I+=B;H=P;P=O;O=M;M=H}H=I-B-1;for(K=0;K<B;++K,++H){T[H]=0}while(F>0){I=r[--F];I-=B+1;if(T[I]==1){T[I]=2,r[F++]=I}I+=1;if(T[I]==1){T[I]=2,r[F++]=I}I+=1;if(T[I]==1){T[I]=2,r[F++]=I}I+=B;if(T[I]==1){T[I]=2,r[F++]=I}I-=2;if(T[I]==1){T[I]=2,r[F++]=I}I+=B;if(T[I]==1){T[I]=2,r[F++]=I}I+=1;if(T[I]==1){T[I]=2,r[F++]=I}I+=1;if(T[I]==1){T[I]=2,r[F++]=I}}I=B+1;P=0;for(K=0;K<L;++K,I+=B){for(H=0;H<C;++H){o[P++]=(T[I+H]==2)*255}}jsfeat.cache.put_buffer(p);jsfeat.cache.put_buffer(m);jsfeat.cache.put_buffer(n);jsfeat.cache.put_buffer(t)},warp_perspective:function(t,D,A,r){if(typeof r==="undefined"){r=0}var l=t.cols|0,v=t.rows|0,L=D.cols|0,j=D.rows|0;var H=t.data,q=D.data;var F=0,E=0,G=0,u=0,k=0,C=0,p=0,h=0,O=0,P=0,s=0,R=0,Q=0,N=0,M=0;var i=A.data;var o=i[0],n=i[1],m=i[2],K=i[3],J=i[4],I=i[5],B=i[6],z=i[7],w=i[8];for(var g=0;E<j;++E){h=n*E+m,O=J*E+I,P=z*E+w;for(F=0;F<L;++F,++g,h+=o,O+=K,P+=B){s=1/P;C=h*s,p=O*s;u=C|0,k=p|0;if(C>0&&p>0&&u<(l-1)&&k<(v-1)){R=Math.max(C-u,0);Q=Math.max(p-k,0);G=(l*k+u)|0;N=H[G]+R*(H[G+1]-H[G]);M=H[G+l]+R*(H[G+l+1]-H[G+l]);q[g]=N+Q*(M-N)}else{q[g]=r}}}},warp_affine:function(k,K,p,J){if(typeof J==="undefined"){J=0}var u=k.cols,z=k.rows,j=K.cols,v=K.rows;var E=k.data,i=K.data;var o=0,n=0,I=0,q=0,A=0,m=0,w=0,G=0,D=0,h=0,g=0;var l=p.data;var t=l[0],s=l[1],r=l[2],H=l[3],F=l[4],C=l[5];for(var B=0;n<v;++n){m=s*n+r;w=F*n+C;for(o=0;o<j;++o,++B,m+=t,w+=H){q=m|0;A=w|0;if(q>=0&&A>=0&&q<(u-1)&&A<(z-1)){G=m-q;D=w-A;I=u*A+q;h=E[I]+G*(E[I+1]-E[I]);g=E[I+u]+G*(E[I+u+1]-E[I+u]);i[B]=h+D*(g-h)}else{i[B]=J}}}},skindetector:function(o,p){var n,m,h,k;var l=o.width*o.height;while(l--){k=l*4;n=o.data[k];m=o.data[k+1];h=o.data[k+2];if((n>95)&&(m>40)&&(h>20)&&(n>m)&&(n>h)&&(n-Math.min(m,h)>15)&&(Math.abs(n-m)>15)){p[l]=255}else{p[l]=0}}}}})();b.imgproc=a})(jsfeat);(function(a){var b=(function(){var h=new Int32Array([0,3,1,3,2,2,3,1,3,0,3,-1,2,-2,1,-3,0,-3,-1,-3,-2,-2,-3,-1,-3,0,-3,1,-2,2,-1,3]);var f=new Uint8Array(512);var e=new Int32Array(25);var i=new Int32Array(25);var d=function(l,n,o){var j=0;var m=h;for(;j<o;++j){l[j]=m[j<<1]+m[(j<<1)+1]*n}for(;j<25;++j){l[j]=l[j-o]}},g=function(j,n,l,r,p){var q=25,o=0,w=j[n];var m=p,t=0,u=0,s=0;for(;o<q;++o){r[o]=w-j[n+l[o]]}for(o=0;o<16;o+=2){t=Math.min(r[o+1],r[o+2]);t=Math.min(t,r[o+3]);if(t<=m){continue}t=Math.min(t,r[o+4]);t=Math.min(t,r[o+5]);t=Math.min(t,r[o+6]);t=Math.min(t,r[o+7]);t=Math.min(t,r[o+8]);m=Math.max(m,Math.min(t,r[o]));m=Math.max(m,Math.min(t,r[o+9]))}u=-m;for(o=0;o<16;o+=2){s=Math.max(r[o+1],r[o+2]);s=Math.max(s,r[o+3]);s=Math.max(s,r[o+4]);s=Math.max(s,r[o+5]);if(s>=u){continue}s=Math.max(s,r[o+6]);s=Math.max(s,r[o+7]);s=Math.max(s,r[o+8]);u=Math.min(u,Math.max(s,r[o]));u=Math.min(u,Math.max(s,r[o+9]))}return -u-1};var c=20;return{set_threshold:function(j){c=Math.min(Math.max(j,0),255);for(var k=-255;k<=255;++k){f[(k+255)]=(k<-c?1:(k>c?2:0))}return c},detect:function(L,H,D){if(typeof D==="undefined"){D=3}var A=8,t=25;var u=L.data,X=L.cols,ar=L.rows;var ap=0,an=0,al=0,E=0,W=0,aq=0;var B=jsfeat.cache.get_buffer(3*X);var O=jsfeat.cache.get_buffer(((X+1)*3)<<2);var I=B.u8;var F=O.i32;var M=e;var J=i;var y=Math.max(3,D);var Z=Math.min((ar-2),(ar-D));var z=Math.max(3,D);var aa=Math.min((X-3),(X-D));var ah=0,P=0,C;var Q=g;var G=f;var p=c;var Y=0,ao=0,au=0,aw=0,U=0,V=0,av=0,R=0,at=0;var T=0,S=0,o=0;d(M,X,16);var am=M[0];var ak=M[1];var aj=M[2];var ai=M[3];var ag=M[4];var af=M[5];var ae=M[6];var ad=M[7];var ac=M[8];var ab=M[9];var s=M[10];var r=M[11];var q=M[12];var n=M[13];var m=M[14];var l=M[15];for(ap=0;ap<X*3;++ap){I[ap]=0}for(ap=y;ap<Z;++ap){av=((ap*X)+z)|0;aq=(ap-3)%3;V=(aq*X)|0;U=(aq*(X+1))|0;for(an=0;an<X;++an){I[V+an]=0}aw=0;if(ap<(Z-1)){an=z;for(;an<aa;++an,++av){Y=u[av];ao=(-Y+255);au=(G[ao+u[av+am]]|G[ao+u[av+ac]]);if(au==0){continue}au&=(G[ao+u[av+aj]]|G[ao+u[av+s]]);au&=(G[ao+u[av+ag]]|G[ao+u[av+q]]);au&=(G[ao+u[av+ae]]|G[ao+u[av+m]]);if(au==0){continue}au&=(G[ao+u[av+ak]]|G[ao+u[av+ab]]);au&=(G[ao+u[av+ai]]|G[ao+u[av+r]]);au&=(G[ao+u[av+af]]|G[ao+u[av+n]]);au&=(G[ao+u[av+ad]]|G[ao+u[av+l]]);if(au&1){E=(Y-p);ah=0;for(al=0;al<t;++al){W=u[(av+M[al])];if(W<E){++ah;if(ah>A){++aw;F[U+aw]=an;I[V+an]=Q(u,av,M,J,p);break}}else{ah=0}}}if(au&2){E=(Y+p);ah=0;for(al=0;al<t;++al){W=u[(av+M[al])];if(W>E){++ah;if(ah>A){++aw;F[U+aw]=an;I[V+an]=Q(u,av,M,J,p);break}}else{ah=0}}}}}F[U+X]=aw;if(ap==y){continue}aq=(ap-4+3)%3;R=(aq*X)|0;U=(aq*(X+1))|0;aq=(ap-5+3)%3;at=(aq*X)|0;aw=F[U+X];for(al=0;al<aw;++al){an=F[U+al];T=(an+1)|0;S=(an-1)|0;o=I[R+an];if((o>I[R+T]&&o>I[R+S]&&o>I[at+S]&&o>I[at+an]&&o>I[at+T]&&o>I[V+S]&&o>I[V+an]&&o>I[V+T])){C=H[P];C.x=an,C.y=(ap-1),C.score=o;P++}}}jsfeat.cache.put_buffer(B);jsfeat.cache.put_buffer(O);return P}}})();a.fast_corners=b;b.set_threshold(20)})(jsfeat);(function(b){var a=(function(){var d=function(e,l,q,i,r,g,p,n,k,j){var m=0,o=0,f=(n*q+p)|0,s=f;for(m=n;m<j;++m,f+=q,s=f){for(o=p;o<k;++o,++s){l[s]=-4*e[s]+e[s+r]+e[s-r]+e[s+g]+e[s-g]}}};var c=function(e,f,k,m,g,l,h){var o=-2*e[f]+e[f+m]+e[f-m];var i=-2*e[f]+e[f+g]+e[f-g];var n=e[f+l]+e[f-l]-e[f+h]-e[f-h];var j=(Math.sqrt(((o-i)*(o-i)+4*n*n)))|0;return Math.min(Math.abs(k-j),Math.abs(-(k+j)))};return{laplacian_threshold:30,min_eigen_value_threshold:25,detect:function(l,A,z){if(typeof z==="undefined"){z=5}var o=0,n=0;var p=l.cols,B=l.rows,q=l.data;var H=5,f=(5*p)|0;var G=(3+3*p)|0,g=(3-3*p)|0;var e=jsfeat.cache.get_buffer((p*B)<<2);var j=e.i32;var i=0,k=0,m=0,r=0,v;var u=0;var F=this.laplacian_threshold;var D=this.min_eigen_value_threshold;var t=Math.max(5,z)|0;var s=Math.max(3,z)|0;var E=Math.min(p-5,p-z)|0;var C=Math.min(B-3,B-z)|0;o=p*B;while(--o>=0){j[o]=0}d(q,j,p,B,H,f,t,s,E,C);k=(s*p+t)|0;for(n=s;n<C;++n,k+=p){for(o=t,m=k;o<E;++o,++m){i=j[m];if((i<-F&&i<j[m-1]&&i<j[m+1]&&i<j[m-p]&&i<j[m+p]&&i<j[m-p-1]&&i<j[m+p-1]&&i<j[m-p+1]&&i<j[m+p+1])||(i>F&&i>j[m-1]&&i>j[m+1]&&i>j[m-p]&&i>j[m+p]&&i>j[m-p-1]&&i>j[m+p-1]&&i>j[m-p+1]&&i>j[m+p+1])){r=c(q,m,i,H,f,G,g);if(r>D){v=A[u];v.x=o,v.y=n,v.score=r;++u;++o,++m}}}}jsfeat.cache.put_buffer(e);return u}}})();b.yape06=a})(jsfeat);(function(a){var b=(function(){var d=function(l,m,k){var j=0;var h,n;h=k;for(n=0;n<h;n++,j++){h=(Math.sqrt((k*k-n*n))+0.5)|0;m[j]=(h+l*n)}for(h--;h<n&&h>=0;h--,j++){n=(Math.sqrt((k*k-h*h))+0.5)|0;m[j]=(h+l*n)}for(;-h<n;h--,j++){n=(Math.sqrt((k*k-h*h))+0.5)|0;m[j]=(h+l*n)}for(n--;n>=0;n--,j++){h=(-Math.sqrt((k*k-n*n))-0.5)|0;m[j]=(h+l*n)}for(;n>h;n--,j++){h=(-Math.sqrt((k*k-n*n))-0.5)|0;m[j]=(h+l*n)}for(h++;h<=0;h++,j++){n=(-Math.sqrt((k*k-h*h))-0.5)|0;m[j]=(h+l*n)}for(;h<-n;h++,j++){n=(-Math.sqrt((k*k-h*h))-0.5)|0;m[j]=(h+l*n)}for(n++;n<0;n++,j++){h=(Math.sqrt((k*k-n*n))+0.5)|0;m[j]=(h+l*n)}m[j]=m[0];m[j+1]=m[1];return j};var g=function(h,j,i){var k=0;if(h[j+1]!=0){k++}if(h[j-1]!=0){k++}if(h[j+i]!=0){k++}if(h[j+i+1]!=0){k++}if(h[j+i-1]!=0){k++}if(h[j-i]!=0){k++}if(h[j-i+1]!=0){k++}if(h[j-i-1]!=0){k++}return k};var c=function(l,m,i,k,j){var h,n;if(i>0){m-=k*j;for(n=-j;n<=j;++n){for(h=-j;h<=j;++h){if(l[m+h]>i){return false}}m+=k}}else{m-=k*j;for(n=-j;n<=j;++n){for(h=-j;h<=j;++h){if(l[m+h]<i){return false}}m+=k}}return true};var e=function(s,r,m,u,p,i,l,n){var k=0;var q=0,o=(l-1)|0;var j=0,w=0,v=0,t=0;var h=0;j=s[r+i[q]];if((j<=p)){if((j>=u)){w=s[r+i[o]];if((w<=p)){if((w>=u)){m[r]=0;return}else{o++;v=s[r+i[o]];if((v>p)){o++;t=s[r+i[o]];if((t>p)){h=3}else{if((t<u)){h=6}else{m[r]=0;return}}}else{o++;t=s[r+i[o]];if((t>p)){h=7}else{if((t<u)){h=2}else{m[r]=0;return}}}}}else{o++;v=s[r+i[o]];if((v>p)){o++;t=s[r+i[o]];if((t>p)){h=3}else{if((t<u)){h=6}else{m[r]=0;return}}}else{if((v<u)){o++;t=s[r+i[o]];if((t>p)){h=7}else{if((t<u)){h=2}else{m[r]=0;return}}}else{m[r]=0;return}}}}else{w=s[r+i[o]];if((w>p)){m[r]=0;return}o++;v=s[r+i[o]];if((v>p)){m[r]=0;return}o++;t=s[r+i[o]];if((t>p)){m[r]=0;return}h=1}}else{w=s[r+i[o]];if((w<u)){m[r]=0;return}o++;v=s[r+i[o]];if((v<u)){m[r]=0;return}o++;t=s[r+i[o]];if((t<u)){m[r]=0;return}h=0}for(q=1;q<=l;q++){j=s[r+i[q]];switch(h){case 0:if((j>p)){v=t;o++;t=s[r+i[o]];if((t<u)){m[r]=0;return}k-=j+v;h=0;break}if((j<u)){if((v>p)){m[r]=0;return}if((t>p)){m[r]=0;return}v=t;o++;t=s[r+i[o]];if((t>p)){m[r]=0;return}k-=j+v;h=8;break}if((v<=p)){m[r]=0;return}if((t<=p)){m[r]=0;return}v=t;o++;t=s[r+i[o]];if((t>p)){k-=j+v;h=3;break}if((t<u)){k-=j+v;h=6;break}m[r]=0;return;case 1:if((j<u)){v=t;o++;t=s[r+i[o]];if((t>p)){m[r]=0;return}k-=j+v;h=1;break}if((j>p)){if((v<u)){m[r]=0;return}if((t<u)){m[r]=0;return}v=t;o++;t=s[r+i[o]];if((t<u)){m[r]=0;return}k-=j+v;h=9;break}if((v>=u)){m[r]=0;return}if((t>=u)){m[r]=0;return}v=t;o++;t=s[r+i[o]];if((t<u)){k-=j+v;h=2;break}if((t>p)){k-=j+v;h=7;break}m[r]=0;return;case 2:if((j>p)){m[r]=0;return}v=t;o++;t=s[r+i[o]];if((j<u)){if((t>p)){m[r]=0;return}k-=j+v;h=4;break}if((t>p)){k-=j+v;h=7;break}if((t<u)){k-=j+v;h=2;break}m[r]=0;return;case 3:if((j<u)){m[r]=0;return}v=t;o++;t=s[r+i[o]];if((j>p)){if((t<u)){m[r]=0;return}k-=j+v;h=5;break}if((t>p)){k-=j+v;h=3;break}if((t<u)){k-=j+v;h=6;break}m[r]=0;return;case 4:if((j>p)){m[r]=0;return}if((j<u)){v=t;o++;t=s[r+i[o]];if((t>p)){m[r]=0;return}k-=j+v;h=1;break}if((t>=u)){m[r]=0;return}v=t;o++;t=s[r+i[o]];if((t<u)){k-=j+v;h=2;break}if((t>p)){k-=j+v;h=7;break}m[r]=0;return;case 5:if((j<u)){m[r]=0;return}if((j>p)){v=t;o++;t=s[r+i[o]];if((t<u)){m[r]=0;return}k-=j+v;h=0;break}if((t<=p)){m[r]=0;return}v=t;o++;t=s[r+i[o]];if((t>p)){k-=j+v;h=3;break}if((t<u)){k-=j+v;h=6;break}m[r]=0;return;case 7:if((j>p)){m[r]=0;return}if((j<u)){m[r]=0;return}v=t;o++;t=s[r+i[o]];if((t>p)){k-=j+v;h=3;break}if((t<u)){k-=j+v;h=6;break}m[r]=0;return;case 6:if((j>p)){m[r]=0;return}if((j<u)){m[r]=0;return}v=t;o++;t=s[r+i[o]];if((t<u)){k-=j+v;h=2;break}if((t>p)){k-=j+v;h=7;break}m[r]=0;return;case 8:if((j>p)){if((t<u)){m[r]=0;return}v=t;o++;t=s[r+i[o]];if((t<u)){m[r]=0;return}k-=j+v;h=9;break}if((j<u)){v=t;o++;t=s[r+i[o]];if((t>p)){m[r]=0;return}k-=j+v;h=1;break}m[r]=0;return;case 9:if((j<u)){if((t>p)){m[r]=0;return}v=t;o++;t=s[r+i[o]];if((t>p)){m[r]=0;return}k-=j+v;h=8;break}if((j>p)){v=t;o++;t=s[r+i[o]];if((t<u)){m[r]=0;return}k-=j+v;h=0;break}m[r]=0;return;default:break}}m[r]=(k+n*s[r])};var f=(function(){function h(i,j,k){this.dirs=new Int32Array(1024);this.dirs_count=d(i,this.dirs,k)|0;this.scores=new Int32Array(i*j);this.radius=k|0}return h})();return{level_tables:[],tau:7,init:function(m,j,h,l){if(typeof l==="undefined"){l=1}var k;h=Math.min(h,7);h=Math.max(h,3);for(k=0;k<l;++k){this.level_tables[k]=new f(m>>k,j>>k,h)}},detect:function(k,J,G){if(typeof G==="undefined"){G=4}var A=this.level_tables[0];var i=A.radius|0,q=(i-1)|0;var m=A.dirs;var n=A.dirs_count|0;var v=n>>1;var O=k.data,u=k.cols|0,K=k.rows|0,N=u>>1;var H=A.scores;var s=0,r=0,j=0,l=0,o=0,p=0,z=0,I=0;var F=this.tau|0;var D=0,E;var C=Math.max(i+1,G)|0;var B=Math.max(i+1,G)|0;var M=Math.min(u-i-2,u-G)|0;var L=Math.min(K-i-2,K-G)|0;j=(B*u+C)|0;for(r=B;r<L;++r,j+=u){for(s=C,l=j;s<M;++s,++l){o=O[l]+F,p=O[l]-F;if(p<O[l+i]&&O[l+i]<o&&p<O[l-i]&&O[l-i]<o){H[l]=0}else{e(O,l,H,p,o,m,v,n)}}}j=(B*u+C)|0;for(r=B;r<L;++r,j+=u){for(s=C,l=j;s<M;++s,++l){I=H[l];z=Math.abs(I);if(z<5){++s,++l}else{if(g(H,l,u)>=3&&c(H,l,I,N,i)){E=J[D];E.x=s,E.y=r,E.score=z;++D;s+=q,l+=q}}}}return D}}})();a.yape=b})(jsfeat);(function(b){var a=(function(){var d=new Int32Array([8,-3,9,5,4,2,7,-12,-11,9,-8,2,7,-12,12,-13,2,-13,2,12,1,-7,1,6,-2,-10,-2,-4,-13,-13,-11,-8,-13,-3,-12,-9,10,4,11,9,-13,-8,-8,-9,-11,7,-9,12,7,7,12,6,-4,-5,-3,0,-13,2,-12,-3,-9,0,-7,5,12,-6,12,-1,-3,6,-2,12,-6,-13,-4,-8,11,-13,12,-8,4,7,5,1,5,-3,10,-3,3,-7,6,12,-8,-7,-6,-2,-2,11,-1,-10,-13,12,-8,10,-7,3,-5,-3,-4,2,-3,7,-10,-12,-6,11,5,-12,6,-7,5,-6,7,-1,1,0,4,-5,9,11,11,-13,4,7,4,12,2,-1,4,4,-4,-12,-2,7,-8,-5,-7,-10,4,11,9,12,0,-8,1,-13,-13,-2,-8,2,-3,-2,-2,3,-6,9,-4,-9,8,12,10,7,0,9,1,3,7,-5,11,-10,-13,-6,-11,0,10,7,12,1,-6,-3,-6,12,10,-9,12,-4,-13,8,-8,-12,-13,0,-8,-4,3,3,7,8,5,7,10,-7,-1,7,1,-12,3,-10,5,6,2,-4,3,-10,-13,0,-13,5,-13,-7,-12,12,-13,3,-11,8,-7,12,-4,7,6,-10,12,8,-9,-1,-7,-6,-2,-5,0,12,-12,5,-7,5,3,-10,8,-13,-7,-7,-4,5,-3,-2,-1,-7,2,9,5,-11,-11,-13,-5,-13,-1,6,0,-1,5,-3,5,2,-4,-13,-4,12,-9,-6,-9,6,-12,-10,-8,-4,10,2,12,-3,7,12,12,12,-7,-13,-6,5,-4,9,-3,4,7,-1,12,2,-7,6,-5,1,-13,11,-12,5,-3,7,-2,-6,7,-8,12,-7,-13,-7,-11,-12,1,-3,12,12,2,-6,3,0,-4,3,-2,-13,-1,-13,1,9,7,1,8,-6,1,-1,3,12,9,1,12,6,-1,-9,-1,3,-13,-13,-10,5,7,7,10,12,12,-5,12,9,6,3,7,11,5,-13,6,10,2,-12,2,3,3,8,4,-6,2,6,12,-13,9,-12,10,3,-8,4,-7,9,-11,12,-4,-6,1,12,2,-8,6,-9,7,-4,2,3,3,-2,6,3,11,0,3,-3,8,-8,7,8,9,3,-11,-5,-6,-4,-10,11,-5,10,-5,-8,-3,12,-10,5,-9,0,8,-1,12,-6,4,-6,6,-11,-10,12,-8,7,4,-2,6,7,-2,0,-2,12,-5,-8,-5,2,7,-6,10,12,-9,-13,-8,-8,-5,-13,-5,-2,8,-8,9,-13,-9,-11,-9,0,1,-8,1,-2,7,-4,9,1,-2,1,-1,-4,11,-6,12,-11,-12,-9,-6,4,3,7,7,12,5,5,10,8,0,-4,2,8,-9,12,-5,-13,0,7,2,12,-1,2,1,7,5,11,7,-9,3,5,6,-8,-13,-4,-8,9,-5,9,-3,-3,-4,-7,-3,-12,6,5,8,0,-7,6,-6,12,-13,6,-5,-2,1,-10,3,10,4,1,8,-4,-2,-2,2,-13,2,-12,12,12,-2,-13,0,-6,4,1,9,3,-6,-10,-3,-5,-3,-13,-1,1,7,5,12,-11,4,-2,5,-7,-13,9,-9,-5,7,1,8,6,7,-8,7,6,-7,-4,-7,1,-8,11,-7,-8,-13,6,-12,-8,2,4,3,9,10,-5,12,3,-6,-5,-6,7,8,-3,9,-8,2,-12,2,8,-11,-2,-10,3,-12,-13,-7,-9,-11,0,-10,-5,5,-3,11,8,-2,-13,-1,12,-1,-8,0,9,-13,-11,-12,-5,-10,-2,-10,11,-3,9,-2,-13,2,-3,3,2,-9,-13,-4,0,-4,6,-3,-10,-4,12,-2,-7,-6,-11,-4,9,6,-3,6,11,-13,11,-5,5,11,11,12,6,7,-5,12,-2,-1,12,0,7,-4,-8,-3,-2,-7,1,-6,7,-13,-12,-8,-13,-7,-2,-6,-8,-8,5,-6,-9,-5,-1,-4,5,-13,7,-8,10,1,5,5,-13,1,0,10,-13,9,12,10,-1,5,-8,10,-9,-1,11,1,-13,-9,-3,-6,2,-1,-10,1,12,-13,1,-8,-10,8,-11,10,-6,2,-13,3,-6,7,-13,12,-9,-10,-10,-5,-7,-10,-8,-8,-13,4,-6,8,5,3,12,8,-13,-4,2,-3,-3,5,-13,10,-12,4,-13,5,-1,-9,9,-4,3,0,3,3,-9,-12,1,-6,1,3,2,4,-8,-10,-10,-10,9,8,-13,12,12,-8,-12,-6,-5,2,2,3,7,10,6,11,-8,6,8,8,-12,-7,10,-6,5,-3,-9,-3,9,-1,-13,-1,5,-3,-7,-3,4,-8,-2,-8,3,4,2,12,12,2,-5,3,11,6,-9,11,-13,3,-1,7,12,11,-1,12,4,-3,0,-3,6,4,-11,4,12,2,-4,2,1,-10,-6,-8,1,-13,7,-11,1,-13,12,-11,-13,6,0,11,-13,0,-1,1,4,-13,3,-9,-2,-9,8,-6,-3,-13,-6,-8,-2,5,-9,8,10,2,7,3,-9,-1,-6,-1,-1,9,5,11,-2,11,-3,12,-8,3,0,3,5,-1,4,0,10,3,-6,4,5,-13,0,-10,5,5,8,12,11,8,9,9,-6,7,-4,8,-12,-10,4,-10,9,7,3,12,4,9,-7,10,-2,7,0,12,-2,-1,-6,0,-11]);var c=new jsfeat.matrix_t(3,3,jsfeat.F32_t|jsfeat.C1_t);var f=new jsfeat.matrix_t(32,32,jsfeat.U8_t|jsfeat.C1_t);var e=function(l,n,k,i,h,j){var m=Math.cos(k);var g=Math.sin(k);c.data[0]=m,c.data[1]=-g,c.data[2]=(-m+g)*j*0.5+i,c.data[3]=g,c.data[4]=m,c.data[5]=(-g-m)*j*0.5+h;jsfeat.imgproc.warp_affine(l,n,c,128)};return{describe:function(j,u,g,B){var r=32;var x=0,A=0,q=0,p=0,z=0;var o=0,m=0,D=0;var C=j.data,n=j.cols,y=j.rows;var t=f.data;var v=16*32+16;var k=0;if(!(B.type&jsfeat.U8_t)){B.type=jsfeat.U8_t;B.cols=r;B.rows=g;B.channel=1;B.allocate()}else{B.resize(r,g,1)}var l=B.data;var s=0;for(x=0;x<g;++x){q=u[x].x;p=u[x].y;z=u[x].angle;e(j,f,z,q,p,32);k=0;for(A=0;A<r;++A){o=t[v+d[k+1]*32+d[k]];k+=2;m=t[v+d[k+1]*32+d[k]];k+=2;D=(o<m)|0;o=t[v+d[k+1]*32+d[k]];k+=2;m=t[v+d[k+1]*32+d[k]];k+=2;D|=(o<m)<<1;o=t[v+d[k+1]*32+d[k]];k+=2;m=t[v+d[k+1]*32+d[k]];k+=2;D|=(o<m)<<2;o=t[v+d[k+1]*32+d[k]];k+=2;m=t[v+d[k+1]*32+d[k]];k+=2;D|=(o<m)<<3;o=t[v+d[k+1]*32+d[k]];k+=2;m=t[v+d[k+1]*32+d[k]];k+=2;D|=(o<m)<<4;o=t[v+d[k+1]*32+d[k]];k+=2;m=t[v+d[k+1]*32+d[k]];k+=2;D|=(o<m)<<5;o=t[v+d[k+1]*32+d[k]];k+=2;m=t[v+d[k+1]*32+d[k]];k+=2;D|=(o<m)<<6;o=t[v+d[k+1]*32+d[k]];k+=2;m=t[v+d[k+1]*32+d[k]];k+=2;D|=(o<m)<<7;l[s+A]=D}s+=r}}}})();b.orb=a})(jsfeat);(function(b){var a=(function(){var c=jsfeat.imgproc.scharr_derivatives;return{track:function(n,u,ap,aL,k,N,R,K,f,q){if(typeof R==="undefined"){R=30}if(typeof K==="undefined"){K=new Uint8Array(k)}if(typeof f==="undefined"){f=0.01}if(typeof q==="undefined"){q=0.0001}var e=(N-1)*0.5;var h=(N*N)|0;var aa=h<<1;var r=n.data,S=u.data;var g=r[0].data,F=S[0].data;var M=r[0].cols,aB=r[0].rows,ay=0,aH=0;var az=jsfeat.cache.get_buffer(h<<2);var s=jsfeat.cache.get_buffer(aa<<2);var t=jsfeat.cache.get_buffer((aB*(M<<1))<<2);var V=new jsfeat.matrix_t(M,aB,jsfeat.S32C2_t,t.data);var w=az.i32;var ac=s.i32;var aA=t.i32;var ab=0,I=0,aM=0,at=0,aI=0,au=0;var am=0,aF=0,aD=0,af=0,ae=0;var E=0,z=0,Y=0,W=0;var p=0,o=0,aE=0,aC=0;var Q=0,P=0,J=0,H=0,ai=0,ak=0,l=0;var d=0,A=0,O=0;var U=0,T=0,aw=0,av=0;var ah=14;var C=14;var Z=C-5;var ax=(1<<((Z)-1));var ad=(1<<ah);var m=(1<<((C)-1));var X=1/(1<<20);var aK=0,aJ=0,ar=0,aq=0,al=0,v=0,B=0;var ao=0,an=0,ag=0,aj=0,aG=0;var G=1.1920929e-7;f*=f;for(;Q<k;++Q){K[Q]=1}var L=(n.levels-1)|0;ai=L;for(;ai>=0;--ai){am=(1/(1<<ai));ay=M>>ai;aH=aB>>ai;ab=ay<<1;g=r[ai].data;F=S[ai].data;A=(ay-N)|0;O=(aH-N)|0;c(r[ai],V);for(ak=0;ak<k;++ak){Q=ak<<1;P=Q+1;aF=ap[Q]*am;aD=ap[P]*am;if(ai==L){af=aF;ae=aD}else{af=aL[Q]*2;ae=aL[P]*2}aL[Q]=af;aL[P]=ae;aF-=e;aD-=e;p=aF|0;o=aD|0;J=(p<=d)|(p>=A)|(o<=d)|(o>=O);if(J!=0){if(ai==0){K[ak]=0}continue}U=aF-p;T=aD-o;aK=(((1-U)*(1-T)*ad)+0.5)|0;aJ=((U*(1-T)*ad)+0.5)|0;ar=(((1-U)*T*ad)+0.5)|0;aq=(ad-aK-aJ-ar);ao=0,an=0,ag=0;for(H=0;H<N;++H){I=((H+o)*ay+p)|0;aM=I<<1;at=(H*N)|0;aI=at<<1;for(J=0;J<N;++J,++I,++at,aM+=2){al=((g[I])*aK+(g[I+1])*aJ+(g[I+ay])*ar+(g[I+ay+1])*aq);al=(((al)+ax)>>(Z));v=(aA[aM]*aK+aA[aM+2]*aJ+aA[aM+ab]*ar+aA[aM+ab+2]*aq);v=(((v)+m)>>(C));B=(aA[aM+1]*aK+aA[aM+3]*aJ+aA[aM+ab+1]*ar+aA[aM+ab+3]*aq);B=(((B)+m)>>(C));w[at]=al;ac[aI++]=v;ac[aI++]=B;ao+=v*v;an+=v*B;ag+=B*B}}ao*=X;an*=X;ag*=X;aj=ao*ag-an*an;aG=(ag+ao-Math.sqrt((ao-ag)*(ao-ag)+4*an*an))/aa;if(aG<q||aj<G){if(ai==0){K[ak]=0}continue}aj=1/aj;af-=e;ae-=e;E=0;z=0;for(l=0;l<R;++l){aE=af|0;aC=ae|0;J=(aE<=d)|(aE>=A)|(aC<=d)|(aC>=O);if(J!=0){if(ai==0){K[ak]=0}break}U=af-aE;T=ae-aC;aK=(((1-U)*(1-T)*ad)+0.5)|0;aJ=((U*(1-T)*ad)+0.5)|0;ar=(((1-U)*T*ad)+0.5)|0;aq=(ad-aK-aJ-ar);aw=0,av=0;for(H=0;H<N;++H){au=((H+aC)*ay+aE)|0;at=(H*N)|0;aI=at<<1;for(J=0;J<N;++J,++au,++at){al=((F[au])*aK+(F[au+1])*aJ+(F[au+ay])*ar+(F[au+ay+1])*aq);al=(((al)+ax)>>(Z));al=(al-w[at]);aw+=al*ac[aI++];av+=al*ac[aI++]}}aw*=X;av*=X;Y=((an*av-ag*aw)*aj);W=((an*aw-ao*av)*aj);af+=Y;ae+=W;aL[Q]=af+e;aL[P]=ae+e;if(Y*Y+W*W<=f){break}if(l>0&&Math.abs(Y+E)<0.01&&Math.abs(W+z)<0.01){aL[Q]-=Y*0.5;aL[P]-=W*0.5;break}E=Y;z=W}}}jsfeat.cache.put_buffer(az);jsfeat.cache.put_buffer(s);jsfeat.cache.put_buffer(t)}}})();b.optical_flow_lk=a})(jsfeat);(function(b){var a=(function(){var c=function(e,d){var f=(e.width*0.25+0.5)|0;return d.x<=e.x+f&&d.x>=e.x-f&&d.y<=e.y+f&&d.y>=e.y-f&&d.width<=(e.width*1.5+0.5)|0&&(d.width*1.5+0.5)|0>=e.width};return{edges_density:0.07,detect_single_scale:function(E,ad,af,q,d,f,D,B){var z=(B.size[0]*D)|0,N=(B.size[1]*D)|0,V=(0.5*D+1.5)|0,U=V;var Z,X,W,Q,O,T=(d-z)|0,R=(f-N)|0;var H=(d+1)|0,w,p,r,S;var e=1/(z*N);var t,o,l,u,s,ae,A,g=true,L,h,n,G,m;var M,K,J,I,v,C;var ac=0,ab=z,aa=N*H,Y=aa+z;var F=((z*N)*255*this.edges_density)|0;var P=[];for(O=0;O<R;O+=U){ac=O*H;for(Q=0;Q<T;Q+=V,ac+=V){p=E[ac]-E[ac+ab]-E[ac+aa]+E[ac+Y];if(q){w=(q[ac]-q[ac+ab]-q[ac+aa]+q[ac+Y]);if(w<F||p<20){Q+=V,ac+=V;continue}}p*=e;r=(ad[ac]-ad[ac+ab]-ad[ac+aa]+ad[ac+Y])*e-p*p;S=r>0?Math.sqrt(r):1;t=B.complexClassifiers;s=t.length;g=true;for(Z=0;Z<s;++Z){o=t[Z];L=o.threshold;l=o.simpleClassifiers;ae=l.length;h=0;for(X=0;X<ae;++X){u=l[X];n=0;m=u.features;A=m.length;if(u.tilted===1){for(W=0;W<A;++W){G=m[W];M=~~(Q+G[0]*D)+~~(O+G[1]*D)*H;v=~~(G[2]*D);C=~~(G[3]*D);K=v*H;J=C*H;n+=(af[M]-af[M+v+K]-af[M-C+J]+af[M+v-C+K+J])*G[4]}}else{for(W=0;W<A;++W){G=m[W];M=~~(Q+G[0]*D)+~~(O+G[1]*D)*H;v=~~(G[2]*D);C=~~(G[3]*D);J=C*H;n+=(E[M]-E[M+v]-E[M+J]+E[M+J+v])*G[4]}}h+=(n*e<u.threshold*S)?u.left_val:u.right_val}if(h<L){g=false;break}}if(g){P.push({x:Q,y:O,width:z,height:N,neighbor:1,confidence:h});Q+=V,ac+=V}}}return P},detect_multi_scale:function(e,m,f,h,d,n,i,g,k){if(typeof g==="undefined"){g=1.2}if(typeof k==="undefined"){k=1}var o=i.size[0];var j=i.size[1];var l=[];while(k*o<d&&k*j<n){l=l.concat(this.detect_single_scale(e,m,f,h,d,n,k,i));k*=g}return l},group_rectangles:function(g,l){if(typeof l==="undefined"){l=1}var y,v,q=g.length;var r=[];for(y=0;y<q;++y){r[y]={parent:-1,element:g[y],rank:0}}for(y=0;y<q;++y){if(!r[y].element){continue}var t=y;while(r[t].parent!=-1){t=r[t].parent}for(v=0;v<q;++v){if(y!=v&&r[v].element&&c(r[y].element,r[v].element)){var s=v;while(r[s].parent!=-1){s=r[s].parent}if(s!=t){if(r[t].rank>r[s].rank){r[s].parent=t}else{r[t].parent=s;if(r[t].rank==r[s].rank){r[s].rank++}t=s}var A,d=v;while(r[d].parent!=-1){A=d;d=r[d].parent;r[A].parent=t}d=y;while(r[d].parent!=-1){A=d;d=r[d].parent;r[A].parent=t}}}}}var w=[];var o=0;for(y=0;y<q;y++){v=-1;var e=y;if(r[e].element){while(r[e].parent!=-1){e=r[e].parent}if(r[e].rank>=0){r[e].rank=~o++}v=~r[e].rank}w[y]=v}var m=[];for(y=0;y<o+1;++y){m[y]={neighbors:0,x:0,y:0,width:0,height:0,confidence:0}}for(y=0;y<q;++y){var z=g[y];var k=w[y];if(m[k].neighbors==0){m[k].confidence=z.confidence}++m[k].neighbors;m[k].x+=z.x;m[k].y+=z.y;m[k].width+=z.width;m[k].height+=z.height;m[k].confidence=Math.max(m[k].confidence,z.confidence)}var h=[];for(y=0;y<o;++y){q=m[y].neighbors;if(q>=l){h.push({x:(m[y].x*2+q)/(2*q),y:(m[y].y*2+q)/(2*q),width:(m[y].width*2+q)/(2*q),height:(m[y].height*2+q)/(2*q),neighbors:m[y].neighbors,confidence:m[y].confidence})}}var p=[];q=h.length;for(y=0;y<q;++y){var z=h[y];var x=true;for(v=0;v<q;++v){var u=h[v];var f=(u.width*0.25+0.5)|0;if(y!=v&&z.x>=u.x-f&&z.y>=u.y-f&&z.x+z.width<=u.x+u.width+f&&z.y+z.height<=u.y+u.height+f&&(u.neighbors>Math.max(3,z.neighbors)||z.neighbors<3)){x=false;break}}if(x){p.push(z)}}return p}}})();b.haar=a})(jsfeat);(function(a){var b=(function(){var c=function(f,e){var g=(f.width*0.25+0.5)|0;return e.x<=f.x+g&&e.x>=f.x-g&&e.y<=f.y+g&&e.y>=f.y-g&&e.width<=(f.width*1.5+0.5)|0&&(e.width*1.5+0.5)|0>=f.width};var d=new jsfeat.pyramid_t(1);return{interval:4,scale:1.1486,next:5,scale_to:1,prepare_cascade:function(g){var m=g.stage_classifier.length;for(var h=0;h<m;h++){var l=g.stage_classifier[h].feature;var e=g.stage_classifier[h].count;var i=g.stage_classifier[h]._feature=new Array(e);for(var f=0;f<e;f++){i[f]={size:l[f].size,px:new Array(l[f].size),pz:new Array(l[f].size),nx:new Array(l[f].size),nz:new Array(l[f].size)}}}},build_pyramid:function(e,k,s,f){if(typeof f==="undefined"){f=4}var q=e.cols,m=e.rows;var l=0,n=0,h=0;var p=false;var j=e,g=e;var r=jsfeat.U8_t|jsfeat.C1_t;this.interval=f;this.scale=Math.pow(2,1/(this.interval+1));this.next=(this.interval+1)|0;this.scale_to=(Math.log(Math.min(q/k,m/s))/Math.log(this.scale))|0;var o=((this.scale_to+this.next*2)*4)|0;if(d.levels!=o){d.levels=o;d.data=new Array(o);p=true;d.data[0]=e}for(l=1;l<=this.interval;++l){n=(q/Math.pow(this.scale,l))|0;h=(m/Math.pow(this.scale,l))|0;j=d.data[l<<2];if(p||n!=j.cols||h!=j.rows){d.data[l<<2]=new jsfeat.matrix_t(n,h,r);j=d.data[l<<2]}jsfeat.imgproc.resample(e,j,n,h)}for(l=this.next;l<this.scale_to+this.next*2;++l){g=d.data[(l<<2)-(this.next<<2)];j=d.data[l<<2];n=g.cols>>1;h=g.rows>>1;if(p||n!=j.cols||h!=j.rows){d.data[l<<2]=new jsfeat.matrix_t(n,h,r);j=d.data[l<<2]}jsfeat.imgproc.pyrdown(g,j)}for(l=this.next*2;l<this.scale_to+this.next*2;++l){g=d.data[(l<<2)-(this.next<<2)];n=g.cols>>1;h=g.rows>>1;j=d.data[(l<<2)+1];if(p||n!=j.cols||h!=j.rows){d.data[(l<<2)+1]=new jsfeat.matrix_t(n,h,r);j=d.data[(l<<2)+1]}jsfeat.imgproc.pyrdown(g,j,1,0);j=d.data[(l<<2)+2];if(p||n!=j.cols||h!=j.rows){d.data[(l<<2)+2]=new jsfeat.matrix_t(n,h,r);j=d.data[(l<<2)+2]}jsfeat.imgproc.pyrdown(g,j,0,1);j=d.data[(l<<2)+3];if(p||n!=j.cols||h!=j.rows){d.data[(l<<2)+3]=new jsfeat.matrix_t(n,h,r);j=d.data[(l<<2)+3]}jsfeat.imgproc.pyrdown(g,j,1,1)}return d},detect:function(G,L){var h=this.interval;var N=this.scale;var m=this.next;var l=this.scale_to;var ab=0,aa=0,Z=0,W=0,S=0,R=0,U=0,B=0,J=0,I=0,V=0,ae=0,M=0,ad=0,w=0,Y=0,g=0;var E=0,X,Q,D,H,F,O=true,o=true;var z=1,v=1;var s=[0,1,0,1];var r=[0,0,1,1];var K=[];var C=G.data,ac=1,u=2,t=4;var A=[],e=[0,0,0];var P=[0,0,0];var T=[0,0,0];for(ab=0;ab<l;ab++){w=(ab<<2);Y=C[w+(m<<3)].cols-(L.width>>2);g=C[w+(m<<3)].rows-(L.height>>2);P[0]=C[w].cols*ac;P[1]=C[w+(m<<2)].cols*ac;P[2]=C[w+(m<<3)].cols*ac;T[0]=(C[w].cols*t)-(Y*t);T[1]=(C[w+(m<<2)].cols*u)-(Y*u);T[2]=(C[w+(m<<3)].cols*ac)-(Y*ac);B=L.stage_classifier.length;for(aa=0;aa<B;aa++){D=L.stage_classifier[aa].feature;Q=L.stage_classifier[aa]._feature;J=L.stage_classifier[aa].count;for(Z=0;Z<J;Z++){H=Q[Z];F=D[Z];I=F.size|0;for(U=0;U<I;U++){H.px[U]=(F.px[U]*ac)+F.py[U]*P[F.pz[U]];H.pz[U]=F.pz[U];H.nx[U]=(F.nx[U]*ac)+F.ny[U]*P[F.nz[U]];H.nz[U]=F.nz[U]}}}A[0]=C[w].data;A[1]=C[w+(m<<2)].data;for(U=0;U<4;U++){A[2]=C[w+(m<<3)+U].data;e[0]=(s[U]*u)+r[U]*(C[w].cols*u);e[1]=(s[U]*ac)+r[U]*(C[w+(m<<2)].cols*ac);e[2]=0;for(R=0;R<g;R++){for(S=0;S<Y;S++){E=0;O=true;B=L.stage_classifier.length;for(aa=0;aa<B;aa++){E=0;X=L.stage_classifier[aa].alpha;Q=L.stage_classifier[aa]._feature;J=L.stage_classifier[aa].count;for(Z=0;Z<J;Z++){H=Q[Z];ae=A[H.pz[0]][e[H.pz[0]]+H.px[0]];M=A[H.nz[0]][e[H.nz[0]]+H.nx[0]];if(ae<=M){E+=X[Z<<1]}else{o=true;I=H.size;for(ad=1;ad<I;ad++){if(H.pz[ad]>=0){V=A[H.pz[ad]][e[H.pz[ad]]+H.px[ad]];if(V<ae){if(V<=M){o=false;break}ae=V}}if(H.nz[ad]>=0){W=A[H.nz[ad]][e[H.nz[ad]]+H.nx[ad]];if(W>M){if(ae<=W){o=false;break}M=W}}}E+=(o)?X[(Z<<1)+1]:X[Z<<1]}}if(E<L.stage_classifier[aa].threshold){O=false;break}}if(O){K.push({x:(S*4+s[U]*2)*z,y:(R*4+r[U]*2)*v,width:L.width*z,height:L.height*v,neighbor:1,confidence:E});++S;e[0]+=t;e[1]+=u;e[2]+=ac}e[0]+=t;e[1]+=u;e[2]+=ac}e[0]+=T[0];e[1]+=T[1];e[2]+=T[2]}}z*=N;v*=N}return K},group_rectangles:function(h,m){if(typeof m==="undefined"){m=1}var z,w,r=h.length;var s=[];for(z=0;z<r;++z){s[z]={parent:-1,element:h[z],rank:0}}for(z=0;z<r;++z){if(!s[z].element){continue}var u=z;while(s[u].parent!=-1){u=s[u].parent}for(w=0;w<r;++w){if(z!=w&&s[w].element&&c(s[z].element,s[w].element)){var t=w;while(s[t].parent!=-1){t=s[t].parent}if(t!=u){if(s[u].rank>s[t].rank){s[t].parent=u}else{s[u].parent=t;if(s[u].rank==s[t].rank){s[t].rank++}u=t}var B,e=w;while(s[e].parent!=-1){B=e;e=s[e].parent;s[B].parent=u}e=z;while(s[e].parent!=-1){B=e;e=s[e].parent;s[B].parent=u}}}}}var x=[];var p=0;for(z=0;z<r;z++){w=-1;var f=z;if(s[f].element){while(s[f].parent!=-1){f=s[f].parent}if(s[f].rank>=0){s[f].rank=~p++}w=~s[f].rank}x[z]=w}var o=[];for(z=0;z<p+1;++z){o[z]={neighbors:0,x:0,y:0,width:0,height:0,confidence:0}}for(z=0;z<r;++z){var A=h[z];var l=x[z];if(o[l].neighbors==0){o[l].confidence=A.confidence}++o[l].neighbors;o[l].x+=A.x;o[l].y+=A.y;o[l].width+=A.width;o[l].height+=A.height;o[l].confidence=Math.max(o[l].confidence,A.confidence)}var k=[];for(z=0;z<p;++z){r=o[z].neighbors;if(r>=m){k.push({x:(o[z].x*2+r)/(2*r),y:(o[z].y*2+r)/(2*r),width:(o[z].width*2+r)/(2*r),height:(o[z].height*2+r)/(2*r),neighbors:o[z].neighbors,confidence:o[z].confidence})}}var q=[];r=k.length;for(z=0;z<r;++z){var A=k[z];var y=true;for(w=0;w<r;++w){var v=k[w];var g=(v.width*0.25+0.5)|0;if(z!=w&&A.x>=v.x-g&&A.y>=v.y-g&&A.x+A.width<=v.x+v.width+g&&A.y+A.height<=v.y+v.height+g&&(v.neighbors>Math.max(3,A.neighbors)||A.neighbors<3)){y=false;break}}if(y){q.push(A)}}return q}}})();a.bbf=b})(jsfeat);(function(a){if(typeof module==="undefined"||typeof module.exports==="undefined"){window.jsfeat=a}else{module.exports=a}})(jsfeat);

// Frontal face

/**
 * this cascade is derived from https://github.com/mtschirs/js-objectdetect implementation
 * @author Martin Tschirsich / http://www.tu-darmstadt.de/~m_t
 */
(function(global) {
    global.frontalface = {complexClassifiers:[{simpleClassifiers:[{features:[[3,7,14,4,-1.],[3,9,14,2,2.]],threshold:4.0141958743333817e-003,right_val:0.8378106951713562,left_val:0.0337941907346249},{features:[[1,2,18,4,-1.],[7,2,6,4,3.]],threshold:0.0151513395830989,right_val:0.7488812208175659,left_val:0.1514132022857666},{features:[[1,7,15,9,-1.],[1,10,15,3,3.]],threshold:4.2109931819140911e-003,right_val:0.6374819874763489,left_val:0.0900492817163467}],threshold:0.8226894140243530},{simpleClassifiers:[{features:[[5,6,2,6,-1.],[5,9,2,3,2.]],threshold:1.6227109590545297e-003,right_val:0.7110946178436279,left_val:0.0693085864186287},{features:[[7,5,6,3,-1.],[9,5,2,3,3.]],threshold:2.2906649392098188e-003,right_val:0.6668692231178284,left_val:0.1795803010463715},{features:[[4,0,12,9,-1.],[4,3,12,3,3.]],threshold:5.0025708042085171e-003,right_val:0.6554006934165955,left_val:0.1693672984838486},{features:[[6,9,10,8,-1.],[6,13,10,4,2.]],threshold:7.9659894108772278e-003,right_val:0.0914145186543465,left_val:0.5866332054138184},{features:[[3,6,14,8,-1.],[3,10,14,4,2.]],threshold:-3.5227010957896709e-003,right_val:0.6031895875930786,left_val:0.1413166970014572},{features:[[14,1,6,10,-1.],[14,1,3,10,2.]],threshold:0.0366676896810532,right_val:0.7920318245887756,left_val:0.3675672113895416},{features:[[7,8,5,12,-1.],[7,12,5,4,3.]],threshold:9.3361474573612213e-003,right_val:0.2088509947061539,left_val:0.6161385774612427},{features:[[1,1,18,3,-1.],[7,1,6,3,3.]],threshold:8.6961314082145691e-003,right_val:0.6360273957252502,left_val:0.2836230993270874},{features:[[1,8,17,2,-1.],[1,9,17,1,2.]],threshold:1.1488880263641477e-003,right_val:0.5800700783729553,left_val:0.2223580926656723},{features:[[16,6,4,2,-1.],[16,7,4,1,2.]],threshold:-2.1484689787030220e-003,right_val:0.5787054896354675,left_val:0.2406464070081711},{features:[[5,17,2,2,-1.],[5,18,2,1,2.]],threshold:2.1219060290604830e-003,right_val:0.1362237036228180,left_val:0.5559654831886292},{features:[[14,2,6,12,-1.],[14,2,3,12,2.]],threshold:-0.0939491465687752,right_val:0.4717740118503571,left_val:0.8502737283706665},{features:[[4,0,4,12,-1.],[4,0,2,6,2.],[6,6,2,6,2.]],threshold:1.3777789426967502e-003,right_val:0.2834529876708984,left_val:0.5993673801422119},{features:[[2,11,18,8,-1.],[8,11,6,8,3.]],threshold:0.0730631574988365,right_val:0.7060034275054932,left_val:0.4341886043548584},{features:[[5,7,10,2,-1.],[5,8,10,1,2.]],threshold:3.6767389974556863e-004,right_val:0.6051574945449829,left_val:0.3027887940406799},{features:[[15,11,5,3,-1.],[15,12,5,1,3.]],threshold:-6.0479710809886456e-003,right_val:0.5675256848335266,left_val:0.1798433959484100}],threshold:6.9566087722778320},{simpleClassifiers:[{features:[[5,3,10,9,-1.],[5,6,10,3,3.]],threshold:-0.0165106896311045,right_val:0.1424857974052429,left_val:0.6644225120544434},{features:[[9,4,2,14,-1.],[9,11,2,7,2.]],threshold:2.7052499353885651e-003,right_val:0.1288477033376694,left_val:0.6325352191925049},{features:[[3,5,4,12,-1.],[3,9,4,4,3.]],threshold:2.8069869149476290e-003,right_val:0.6193193197250366,left_val:0.1240288019180298},{features:[[4,5,12,5,-1.],[8,5,4,5,3.]],threshold:-1.5402400167658925e-003,right_val:0.5670015811920166,left_val:0.1432143002748489},{features:[[5,6,10,8,-1.],[5,10,10,4,2.]],threshold:-5.6386279175058007e-004,right_val:0.5905207991600037,left_val:0.1657433062791824},{features:[[8,0,6,9,-1.],[8,3,6,3,3.]],threshold:1.9253729842603207e-003,right_val:0.5738824009895325,left_val:0.2695507109165192},{features:[[9,12,1,8,-1.],[9,16,1,4,2.]],threshold:-5.0214841030538082e-003,right_val:0.5782774090766907,left_val:0.1893538981676102},{features:[[0,7,20,6,-1.],[0,9,20,2,3.]],threshold:2.6365420781075954e-003,right_val:0.5695425868034363,left_val:0.2309329062700272},{features:[[7,0,6,17,-1.],[9,0,2,17,3.]],threshold:-1.5127769438549876e-003,right_val:0.5956642031669617,left_val:0.2759602069854736},{features:[[9,0,6,4,-1.],[11,0,2,4,3.]],threshold:-0.0101574398577213,right_val:0.5522047281265259,left_val:0.1732538044452667},{features:[[5,1,6,4,-1.],[7,1,2,4,3.]],threshold:-0.0119536602869630,right_val:0.5559014081954956,left_val:0.1339409947395325},{features:[[12,1,6,16,-1.],[14,1,2,16,3.]],threshold:4.8859491944313049e-003,right_val:0.6188849210739136,left_val:0.3628703951835632},{features:[[0,5,18,8,-1.],[0,5,9,4,2.],[9,9,9,4,2.]],threshold:-0.0801329165697098,right_val:0.5475944876670837,left_val:0.0912110507488251},{features:[[8,15,10,4,-1.],[13,15,5,2,2.],[8,17,5,2,2.]],threshold:1.0643280111253262e-003,right_val:0.5711399912834168,left_val:0.3715142905712128},{features:[[3,1,4,8,-1.],[3,1,2,4,2.],[5,5,2,4,2.]],threshold:-1.3419450260698795e-003,right_val:0.3318097889423370,left_val:0.5953313708305359},{features:[[3,6,14,10,-1.],[10,6,7,5,2.],[3,11,7,5,2.]],threshold:-0.0546011403203011,right_val:0.5602846145629883,left_val:0.1844065934419632},{features:[[2,1,6,16,-1.],[4,1,2,16,3.]],threshold:2.9071690514683723e-003,right_val:0.6131715178489685,left_val:0.3594244122505188},{features:[[0,18,20,2,-1.],[0,19,20,1,2.]],threshold:7.4718717951327562e-004,right_val:0.3459562957286835,left_val:0.5994353294372559},{features:[[8,13,4,3,-1.],[8,14,4,1,3.]],threshold:4.3013808317482471e-003,right_val:0.6990845203399658,left_val:0.4172652065753937},{features:[[9,14,2,3,-1.],[9,15,2,1,3.]],threshold:4.5017572119832039e-003,right_val:0.7801457047462463,left_val:0.4509715139865875},{features:[[0,12,9,6,-1.],[0,14,9,2,3.]],threshold:0.0241385009139776,right_val:0.1319826990365982,left_val:0.5438212752342224}],threshold:9.4985427856445313},{simpleClassifiers:[{features:[[5,7,3,4,-1.],[5,9,3,2,2.]],threshold:1.9212230108678341e-003,right_val:0.6199870705604553,left_val:0.1415266990661621},{features:[[9,3,2,16,-1.],[9,11,2,8,2.]],threshold:-1.2748669541906565e-004,right_val:0.1884928941726685,left_val:0.6191074252128601},{features:[[3,6,13,8,-1.],[3,10,13,4,2.]],threshold:5.1409931620582938e-004,right_val:0.5857927799224854,left_val:0.1487396955490112},{features:[[12,3,8,2,-1.],[12,3,4,2,2.]],threshold:4.1878609918057919e-003,right_val:0.6359239816665649,left_val:0.2746909856796265},{features:[[8,8,4,12,-1.],[8,12,4,4,3.]],threshold:5.1015717908740044e-003,right_val:0.2175628989934921,left_val:0.5870851278305054},{features:[[11,3,8,6,-1.],[15,3,4,3,2.],[11,6,4,3,2.]],threshold:-2.1448440384119749e-003,right_val:0.2979590892791748,left_val:0.5880944728851318},{features:[[7,1,6,19,-1.],[9,1,2,19,3.]],threshold:-2.8977119363844395e-003,right_val:0.5876647233963013,left_val:0.2373327016830444},{features:[[9,0,6,4,-1.],[11,0,2,4,3.]],threshold:-0.0216106791049242,right_val:0.5194202065467835,left_val:0.1220654994249344},{features:[[3,1,9,3,-1.],[6,1,3,3,3.]],threshold:-4.6299318782985210e-003,right_val:0.5817409157752991,left_val:0.2631230950355530},{features:[[8,15,10,4,-1.],[13,15,5,2,2.],[8,17,5,2,2.]],threshold:5.9393711853772402e-004,right_val:0.5698544979095459,left_val:0.3638620078563690},{features:[[0,3,6,10,-1.],[3,3,3,10,2.]],threshold:0.0538786612451077,right_val:0.7559366226196289,left_val:0.4303531050682068},{features:[[3,4,15,15,-1.],[3,9,15,5,3.]],threshold:1.8887349870055914e-003,right_val:0.5613427162170410,left_val:0.2122603058815002},{features:[[6,5,8,6,-1.],[6,7,8,2,3.]],threshold:-2.3635339457541704e-003,right_val:0.2642767131328583,left_val:0.5631849169731140},{features:[[4,4,12,10,-1.],[10,4,6,5,2.],[4,9,6,5,2.]],threshold:0.0240177996456623,right_val:0.2751705944538117,left_val:0.5797107815742493},{features:[[6,4,4,4,-1.],[8,4,2,4,2.]],threshold:2.0543030404951423e-004,right_val:0.5752568840980530,left_val:0.2705242037773132},{features:[[15,11,1,2,-1.],[15,12,1,1,2.]],threshold:8.4790197433903813e-004,right_val:0.2334876954555512,left_val:0.5435624718666077},{features:[[3,11,2,2,-1.],[3,12,2,1,2.]],threshold:1.4091329649090767e-003,right_val:0.2063155025243759,left_val:0.5319424867630005},{features:[[16,11,1,3,-1.],[16,12,1,1,3.]],threshold:1.4642629539594054e-003,right_val:0.3068861067295075,left_val:0.5418980717658997},{features:[[3,15,6,4,-1.],[3,15,3,2,2.],[6,17,3,2,2.]],threshold:1.6352549428120255e-003,right_val:0.6112868189811707,left_val:0.3695372939109802},{features:[[6,7,8,2,-1.],[6,8,8,1,2.]],threshold:8.3172752056270838e-004,right_val:0.6025236248970032,left_val:0.3565036952495575},{features:[[3,11,1,3,-1.],[3,12,1,1,3.]],threshold:-2.0998890977352858e-003,right_val:0.5362827181816101,left_val:0.1913982033729553},{features:[[6,0,12,2,-1.],[6,1,12,1,2.]],threshold:-7.4213981861248612e-004,right_val:0.5529310107231140,left_val:0.3835555016994476},{features:[[9,14,2,3,-1.],[9,15,2,1,3.]],threshold:3.2655049581080675e-003,right_val:0.7101895809173584,left_val:0.4312896132469177},{features:[[7,15,6,2,-1.],[7,16,6,1,2.]],threshold:8.9134991867467761e-004,right_val:0.6391963958740234,left_val:0.3984830975532532},{features:[[0,5,4,6,-1.],[0,7,4,2,3.]],threshold:-0.0152841797098517,right_val:0.5433713793754578,left_val:0.2366732954978943},{features:[[4,12,12,2,-1.],[8,12,4,2,3.]],threshold:4.8381411470472813e-003,right_val:0.3239189088344574,left_val:0.5817500948905945},{features:[[6,3,1,9,-1.],[6,6,1,3,3.]],threshold:-9.1093179071322083e-004,right_val:0.2911868989467621,left_val:0.5540593862533569},{features:[[10,17,3,2,-1.],[11,17,1,2,3.]],threshold:-6.1275060288608074e-003,right_val:0.5196629166603088,left_val:0.1775255054235458},{features:[[9,9,2,2,-1.],[9,10,2,1,2.]],threshold:-4.4576259097084403e-004,right_val:0.5533593893051148,left_val:0.3024170100688934},{features:[[7,6,6,4,-1.],[9,6,2,4,3.]],threshold:0.0226465407758951,right_val:0.6975377202033997,left_val:0.4414930939674377},{features:[[7,17,3,2,-1.],[8,17,1,2,3.]],threshold:-1.8804960418492556e-003,right_val:0.5497952103614807,left_val:0.2791394889354706},{features:[[10,17,3,3,-1.],[11,17,1,3,3.]],threshold:7.0889107882976532e-003,right_val:0.2385547012090683,left_val:0.5263199210166931},{features:[[8,12,3,2,-1.],[8,13,3,1,2.]],threshold:1.7318050377070904e-003,right_val:0.6983600854873657,left_val:0.4319379031658173},{features:[[9,3,6,2,-1.],[11,3,2,2,3.]],threshold:-6.8482700735330582e-003,right_val:0.5390920042991638,left_val:0.3082042932510376},{features:[[3,11,14,4,-1.],[3,13,14,2,2.]],threshold:-1.5062530110299122e-005,right_val:0.3120366036891937,left_val:0.5521922111511231},{features:[[1,10,18,4,-1.],[10,10,9,2,2.],[1,12,9,2,2.]],threshold:0.0294755697250366,right_val:0.1770603060722351,left_val:0.5401322841644287},{features:[[0,10,3,3,-1.],[0,11,3,1,3.]],threshold:8.1387329846620560e-003,right_val:0.1211019009351730,left_val:0.5178617835044861},{features:[[9,1,6,6,-1.],[11,1,2,6,3.]],threshold:0.0209429506212473,right_val:0.3311221897602081,left_val:0.5290294289588928},{features:[[8,7,3,6,-1.],[9,7,1,6,3.]],threshold:-9.5665529370307922e-003,right_val:0.4451968967914581,left_val:0.7471994161605835}],threshold:18.4129695892333980},{simpleClassifiers:[{features:[[1,0,18,9,-1.],[1,3,18,3,3.]],threshold:-2.8206960996612906e-004,right_val:0.6076732277870178,left_val:0.2064086049795151},{features:[[12,10,2,6,-1.],[12,13,2,3,2.]],threshold:1.6790600493550301e-003,right_val:0.1255383938550949,left_val:0.5851997137069702},{features:[[0,5,19,8,-1.],[0,9,19,4,2.]],threshold:6.9827912375330925e-004,right_val:0.5728961229324341,left_val:0.0940184295177460},{features:[[7,0,6,9,-1.],[9,0,2,9,3.]],threshold:7.8959012171253562e-004,right_val:0.5694308876991272,left_val:0.1781987994909287},{features:[[5,3,6,1,-1.],[7,3,2,1,3.]],threshold:-2.8560499195009470e-003,right_val:0.5788664817810059,left_val:0.1638399064540863},{features:[[11,3,6,1,-1.],[13,3,2,1,3.]],threshold:-3.8122469559311867e-003,right_val:0.5508564710617065,left_val:0.2085440009832382},{features:[[5,10,4,6,-1.],[5,13,4,3,2.]],threshold:1.5896620461717248e-003,right_val:0.1857215017080307,left_val:0.5702760815620422},{features:[[11,3,6,1,-1.],[13,3,2,1,3.]],threshold:0.0100783398374915,right_val:0.2189770042896271,left_val:0.5116943120956421},{features:[[4,4,12,6,-1.],[4,6,12,2,3.]],threshold:-0.0635263025760651,right_val:0.4043813049793243,left_val:0.7131379842758179},{features:[[15,12,2,6,-1.],[15,14,2,2,3.]],threshold:-9.1031491756439209e-003,right_val:0.5463973283767700,left_val:0.2567181885242462},{features:[[9,3,2,2,-1.],[10,3,1,2,2.]],threshold:-2.4035000242292881e-003,right_val:0.5590974092483521,left_val:0.1700665950775147},{features:[[9,3,3,1,-1.],[10,3,1,1,3.]],threshold:1.5226360410451889e-003,right_val:0.2619054019451141,left_val:0.5410556793212891},{features:[[1,1,4,14,-1.],[3,1,2,14,2.]],threshold:0.0179974399507046,right_val:0.6535220742225647,left_val:0.3732436895370483},{features:[[9,0,4,4,-1.],[11,0,2,2,2.],[9,2,2,2,2.]],threshold:-6.4538191072642803e-003,right_val:0.5537446141242981,left_val:0.2626481950283051},{features:[[7,5,1,14,-1.],[7,12,1,7,2.]],threshold:-0.0118807600811124,right_val:0.5544745922088623,left_val:0.2003753930330277},{features:[[19,0,1,4,-1.],[19,2,1,2,2.]],threshold:1.2713660253211856e-003,right_val:0.3031975924968720,left_val:0.5591902732849121},{features:[[5,5,6,4,-1.],[8,5,3,4,2.]],threshold:1.1376109905540943e-003,right_val:0.5646508932113648,left_val:0.2730407118797302},{features:[[9,18,3,2,-1.],[10,18,1,2,3.]],threshold:-4.2651998810470104e-003,right_val:0.5461820960044861,left_val:0.1405909061431885},{features:[[8,18,3,2,-1.],[9,18,1,2,3.]],threshold:-2.9602861031889915e-003,right_val:0.5459290146827698,left_val:0.1795035004615784},{features:[[4,5,12,6,-1.],[4,7,12,2,3.]],threshold:-8.8448226451873779e-003,right_val:0.2809219956398010,left_val:0.5736783146858215},{features:[[3,12,2,6,-1.],[3,14,2,2,3.]],threshold:-6.6430689767003059e-003,right_val:0.5503826141357422,left_val:0.2370675951242447},{features:[[10,8,2,12,-1.],[10,12,2,4,3.]],threshold:3.9997808635234833e-003,right_val:0.3304282128810883,left_val:0.5608199834823608},{features:[[7,18,3,2,-1.],[8,18,1,2,3.]],threshold:-4.1221720166504383e-003,right_val:0.5378993153572083,left_val:0.1640105992555618},{features:[[9,0,6,2,-1.],[11,0,2,2,3.]],threshold:0.0156249096617103,right_val:0.2288603931665421,left_val:0.5227649211883545},{features:[[5,11,9,3,-1.],[5,12,9,1,3.]],threshold:-0.0103564197197557,right_val:0.4252927899360657,left_val:0.7016193866729736},{features:[[9,0,6,2,-1.],[11,0,2,2,3.]],threshold:-8.7960809469223022e-003,right_val:0.5355830192565918,left_val:0.2767347097396851},{features:[[1,1,18,5,-1.],[7,1,6,5,3.]],threshold:0.1622693985700607,right_val:0.7442579269409180,left_val:0.4342240095138550},{features:[[8,0,4,4,-1.],[10,0,2,2,2.],[8,2,2,2,2.]],threshold:4.5542530715465546e-003,right_val:0.2582125067710877,left_val:0.5726485848426819},{features:[[3,12,1,3,-1.],[3,13,1,1,3.]],threshold:-2.1309209987521172e-003,right_val:0.5361018776893616,left_val:0.2106848061084747},{features:[[8,14,5,3,-1.],[8,15,5,1,3.]],threshold:-0.0132084200158715,right_val:0.4552468061447144,left_val:0.7593790888786316},{features:[[5,4,10,12,-1.],[5,4,5,6,2.],[10,10,5,6,2.]],threshold:-0.0659966766834259,right_val:0.5344039797782898,left_val:0.1252475976943970},{features:[[9,6,9,12,-1.],[9,10,9,4,3.]],threshold:7.9142656177282333e-003,right_val:0.5601043105125427,left_val:0.3315384089946747},{features:[[2,2,12,14,-1.],[2,2,6,7,2.],[8,9,6,7,2.]],threshold:0.0208942797034979,right_val:0.2768838107585907,left_val:0.5506049990653992}],threshold:15.3241395950317380},{simpleClassifiers:[{features:[[4,7,12,2,-1.],[8,7,4,2,3.]],threshold:1.1961159761995077e-003,right_val:0.6156241297721863,left_val:0.1762690991163254},{features:[[7,4,6,4,-1.],[7,6,6,2,2.]],threshold:-1.8679830245673656e-003,right_val:0.1832399964332581,left_val:0.6118106842041016},{features:[[4,5,11,8,-1.],[4,9,11,4,2.]],threshold:-1.9579799845814705e-004,right_val:0.5723816156387329,left_val:0.0990442633628845},{features:[[3,10,16,4,-1.],[3,12,16,2,2.]],threshold:-8.0255657667294145e-004,right_val:0.2377282977104187,left_val:0.5579879879951477},{features:[[0,0,16,2,-1.],[0,1,16,1,2.]],threshold:-2.4510810617357492e-003,right_val:0.5858935117721558,left_val:0.2231457978487015},{features:[[7,5,6,2,-1.],[9,5,2,2,3.]],threshold:5.0361850298941135e-004,right_val:0.5794103741645813,left_val:0.2653993964195252},{features:[[3,2,6,10,-1.],[3,2,3,5,2.],[6,7,3,5,2.]],threshold:4.0293349884450436e-003,right_val:0.2484865039587021,left_val:0.5803827047348023},{features:[[10,5,8,15,-1.],[10,10,8,5,3.]],threshold:-0.0144517095759511,right_val:0.5484204888343811,left_val:0.1830351948738098},{features:[[3,14,8,6,-1.],[3,14,4,3,2.],[7,17,4,3,2.]],threshold:2.0380979403853416e-003,right_val:0.6051092743873596,left_val:0.3363558948040009},{features:[[14,2,2,2,-1.],[14,3,2,1,2.]],threshold:-1.6155190533027053e-003,right_val:0.5441246032714844,left_val:0.2286642044782639},{features:[[1,10,7,6,-1.],[1,13,7,3,2.]],threshold:3.3458340913057327e-003,right_val:0.2392338067293167,left_val:0.5625913143157959},{features:[[15,4,4,3,-1.],[15,4,2,3,2.]],threshold:1.6379579901695251e-003,right_val:0.5964621901512146,left_val:0.3906993865966797},{features:[[2,9,14,6,-1.],[2,9,7,3,2.],[9,12,7,3,2.]],threshold:0.0302512105554342,right_val:0.1575746983289719,left_val:0.5248482227325440},{features:[[5,7,10,4,-1.],[5,9,10,2,2.]],threshold:0.0372519902884960,right_val:0.6748418807983398,left_val:0.4194310903549194},{features:[[6,9,8,8,-1.],[6,9,4,4,2.],[10,13,4,4,2.]],threshold:-0.0251097902655602,right_val:0.5473451018333435,left_val:0.1882549971342087},{features:[[14,1,3,2,-1.],[14,2,3,1,2.]],threshold:-5.3099058568477631e-003,right_val:0.5227110981941223,left_val:0.1339973062276840},{features:[[1,4,4,2,-1.],[3,4,2,2,2.]],threshold:1.2086479691788554e-003,right_val:0.6109635829925537,left_val:0.3762088119983673},{features:[[11,10,2,8,-1.],[11,14,2,4,2.]],threshold:-0.0219076797366142,right_val:0.5404006838798523,left_val:0.2663142979145050},{features:[[0,0,5,3,-1.],[0,1,5,1,3.]],threshold:5.4116579703986645e-003,right_val:0.2232273072004318,left_val:0.5363578796386719},{features:[[2,5,18,8,-1.],[11,5,9,4,2.],[2,9,9,4,2.]],threshold:0.0699463263154030,right_val:0.2453698068857193,left_val:0.5358232855796814},{features:[[6,6,1,6,-1.],[6,9,1,3,2.]],threshold:3.4520021290518343e-004,right_val:0.5376930236816406,left_val:0.2409671992063522},{features:[[19,1,1,3,-1.],[19,2,1,1,3.]],threshold:1.2627709656953812e-003,right_val:0.3155693113803864,left_val:0.5425856709480286},{features:[[7,6,6,6,-1.],[9,6,2,6,3.]],threshold:0.0227195098996162,right_val:0.6597865223884583,left_val:0.4158405959606171},{features:[[19,1,1,3,-1.],[19,2,1,1,3.]],threshold:-1.8111000536009669e-003,right_val:0.5505244731903076,left_val:0.2811253070831299},{features:[[3,13,2,3,-1.],[3,14,2,1,3.]],threshold:3.3469670452177525e-003,right_val:0.1891465038061142,left_val:0.5260028243064880},{features:[[8,4,8,12,-1.],[12,4,4,6,2.],[8,10,4,6,2.]],threshold:4.0791751234792173e-004,right_val:0.3344210088253021,left_val:0.5673509240150452},{features:[[5,2,6,3,-1.],[7,2,2,3,3.]],threshold:0.0127347996458411,right_val:0.2395612001419067,left_val:0.5343592166900635},{features:[[6,1,9,10,-1.],[6,6,9,5,2.]],threshold:-7.3119727894663811e-003,right_val:0.4022207856178284,left_val:0.6010890007019043},{features:[[0,4,6,12,-1.],[2,4,2,12,3.]],threshold:-0.0569487512111664,right_val:0.4543190896511078,left_val:0.8199151158332825},{features:[[15,13,2,3,-1.],[15,14,2,1,3.]],threshold:-5.0116591155529022e-003,right_val:0.5357710719108582,left_val:0.2200281023979187},{features:[[7,14,5,3,-1.],[7,15,5,1,3.]],threshold:6.0334368608891964e-003,right_val:0.7181751132011414,left_val:0.4413081109523773},{features:[[15,13,3,3,-1.],[15,14,3,1,3.]],threshold:3.9437441155314445e-003,right_val:0.2791733145713806,left_val:0.5478860735893250},{features:[[6,14,8,3,-1.],[6,15,8,1,3.]],threshold:-3.6591119132936001e-003,right_val:0.3989723920822144,left_val:0.6357867717742920},{features:[[15,13,3,3,-1.],[15,14,3,1,3.]],threshold:-3.8456181064248085e-003,right_val:0.5300664901733398,left_val:0.3493686020374298},{features:[[2,13,3,3,-1.],[2,14,3,1,3.]],threshold:-7.1926261298358440e-003,right_val:0.5229672789573669,left_val:0.1119614988565445},{features:[[4,7,12,12,-1.],[10,7,6,6,2.],[4,13,6,6,2.]],threshold:-0.0527989417314529,right_val:0.5453451275825501,left_val:0.2387102991342545},{features:[[9,7,2,6,-1.],[10,7,1,6,2.]],threshold:-7.9537667334079742e-003,right_val:0.4439376890659332,left_val:0.7586917877197266},{features:[[8,9,5,2,-1.],[8,10,5,1,2.]],threshold:-2.7344180271029472e-003,right_val:0.5489321947097778,left_val:0.2565476894378662},{features:[[8,6,3,4,-1.],[9,6,1,4,3.]],threshold:-1.8507939530536532e-003,right_val:0.4252474904060364,left_val:0.6734347939491272},{features:[[9,6,2,8,-1.],[9,10,2,4,2.]],threshold:0.0159189198166132,right_val:0.2292661964893341,left_val:0.5488352775573731},{features:[[7,7,3,6,-1.],[8,7,1,6,3.]],threshold:-1.2687679845839739e-003,right_val:0.4022389948368073,left_val:0.6104331016540527},{features:[[11,3,3,3,-1.],[12,3,1,3,3.]],threshold:6.2883910723030567e-003,right_val:0.1536193042993546,left_val:0.5310853123664856},{features:[[5,4,6,1,-1.],[7,4,2,1,3.]],threshold:-6.2259892001748085e-003,right_val:0.5241606235504150,left_val:0.1729111969470978},{features:[[5,6,10,3,-1.],[5,7,10,1,3.]],threshold:-0.0121325999498367,right_val:0.4325182139873505,left_val:0.6597759723663330}],threshold:21.0106391906738280},{simpleClassifiers:[{features:[[7,3,6,9,-1.],[7,6,6,3,3.]],threshold:-3.9184908382594585e-003,right_val:0.1469330936670303,left_val:0.6103435158729553},{features:[[6,7,9,1,-1.],[9,7,3,1,3.]],threshold:1.5971299726516008e-003,right_val:0.5896466970443726,left_val:0.2632363140583038},{features:[[2,8,16,8,-1.],[2,12,16,4,2.]],threshold:0.0177801102399826,right_val:0.1760361939668655,left_val:0.5872874259948731},{features:[[14,6,2,6,-1.],[14,9,2,3,2.]],threshold:6.5334769897162914e-004,right_val:0.5596066117286682,left_val:0.1567801982164383},{features:[[1,5,6,15,-1.],[1,10,6,5,3.]],threshold:-2.8353091329336166e-004,right_val:0.5732036232948303,left_val:0.1913153976202011},{features:[[10,0,6,9,-1.],[10,3,6,3,3.]],threshold:1.6104689566418529e-003,right_val:0.5623080730438232,left_val:0.2914913892745972},{features:[[6,6,7,14,-1.],[6,13,7,7,2.]],threshold:-0.0977506190538406,right_val:0.5648233294487000,left_val:0.1943476945161820},{features:[[13,7,3,6,-1.],[13,9,3,2,3.]],threshold:5.5182358482852578e-004,right_val:0.5504639744758606,left_val:0.3134616911411285},{features:[[1,8,15,4,-1.],[6,8,5,4,3.]],threshold:-0.0128582203760743,right_val:0.5760142803192139,left_val:0.2536481916904450},{features:[[11,2,3,10,-1.],[11,7,3,5,2.]],threshold:4.1530239395797253e-003,right_val:0.3659774065017700,left_val:0.5767722129821777},{features:[[3,7,4,6,-1.],[3,9,4,2,3.]],threshold:1.7092459602281451e-003,right_val:0.5918939113616943,left_val:0.2843191027641296},{features:[[13,3,6,10,-1.],[15,3,2,10,3.]],threshold:7.5217359699308872e-003,right_val:0.6183109283447266,left_val:0.4052427113056183},{features:[[5,7,8,10,-1.],[5,7,4,5,2.],[9,12,4,5,2.]],threshold:2.2479810286313295e-003,right_val:0.3135401010513306,left_val:0.5783755183219910},{features:[[4,4,12,12,-1.],[10,4,6,6,2.],[4,10,6,6,2.]],threshold:0.0520062111318111,right_val:0.1916636973619461,left_val:0.5541312098503113},{features:[[1,4,6,9,-1.],[3,4,2,9,3.]],threshold:0.0120855299755931,right_val:0.6644591093063355,left_val:0.4032655954360962},{features:[[11,3,2,5,-1.],[11,3,1,5,2.]],threshold:1.4687820112158079e-005,right_val:0.5709382891654968,left_val:0.3535977900028229},{features:[[7,3,2,5,-1.],[8,3,1,5,2.]],threshold:7.1395188570022583e-006,right_val:0.5610269904136658,left_val:0.3037444949150085},{features:[[10,14,2,3,-1.],[10,15,2,1,3.]],threshold:-4.6001640148460865e-003,right_val:0.4580326080322266,left_val:0.7181087136268616},{features:[[5,12,6,2,-1.],[8,12,3,2,2.]],threshold:2.0058949012309313e-003,right_val:0.2953684031963348,left_val:0.5621951818466187},{features:[[9,14,2,3,-1.],[9,15,2,1,3.]],threshold:4.5050270855426788e-003,right_val:0.7619017958641052,left_val:0.4615387916564941},{features:[[4,11,12,6,-1.],[4,14,12,3,2.]],threshold:0.0117468303069472,right_val:0.1772529035806656,left_val:0.5343837141990662},{features:[[11,11,5,9,-1.],[11,14,5,3,3.]],threshold:-0.0583163388073444,right_val:0.5340772271156311,left_val:0.1686245948076248},{features:[[6,15,3,2,-1.],[6,16,3,1,2.]],threshold:2.3629379575140774e-004,right_val:0.6026803851127625,left_val:0.3792056143283844},{features:[[11,0,3,5,-1.],[12,0,1,5,3.]],threshold:-7.8156180679798126e-003,right_val:0.5324323773384094,left_val:0.1512867063283920},{features:[[5,5,6,7,-1.],[8,5,3,7,2.]],threshold:-0.0108761601150036,right_val:0.5319945216178894,left_val:0.2081822007894516},{features:[[13,0,1,9,-1.],[13,3,1,3,3.]],threshold:-2.7745519764721394e-003,right_val:0.5210328102111816,left_val:0.4098246991634369},{features:[[3,2,4,8,-1.],[3,2,2,4,2.],[5,6,2,4,2.]],threshold:-7.8276381827890873e-004,right_val:0.3478842079639435,left_val:0.5693274140357971},{features:[[13,12,4,6,-1.],[13,14,4,2,3.]],threshold:0.0138704096898437,right_val:0.2257698029279709,left_val:0.5326750874519348},{features:[[3,12,4,6,-1.],[3,14,4,2,3.]],threshold:-0.0236749108880758,right_val:0.5200707912445068,left_val:0.1551305055618286},{features:[[13,11,3,4,-1.],[13,13,3,2,2.]],threshold:-1.4879409718560055e-005,right_val:0.3820176124572754,left_val:0.5500566959381104},{features:[[4,4,4,3,-1.],[4,5,4,1,3.]],threshold:3.6190641112625599e-003,right_val:0.6639748215675354,left_val:0.4238683879375458},{features:[[7,5,11,8,-1.],[7,9,11,4,2.]],threshold:-0.0198171101510525,right_val:0.5382357835769653,left_val:0.2150038033723831},{features:[[7,8,3,4,-1.],[8,8,1,4,3.]],threshold:-3.8154039066284895e-003,right_val:0.4215297102928162,left_val:0.6675711274147034},{features:[[9,1,6,1,-1.],[11,1,2,1,3.]],threshold:-4.9775829538702965e-003,right_val:0.5386328101158142,left_val:0.2267289012670517},{features:[[5,5,3,3,-1.],[5,6,3,1,3.]],threshold:2.2441020701080561e-003,right_val:0.6855735778808594,left_val:0.4308691024780273},{features:[[0,9,20,6,-1.],[10,9,10,3,2.],[0,12,10,3,2.]],threshold:0.0122824599966407,right_val:0.3467479050159454,left_val:0.5836614966392517},{features:[[8,6,3,5,-1.],[9,6,1,5,3.]],threshold:-2.8548699337989092e-003,right_val:0.4311453998088837,left_val:0.7016944885253906},{features:[[11,0,1,3,-1.],[11,1,1,1,3.]],threshold:-3.7875669077038765e-003,right_val:0.5224946141242981,left_val:0.2895345091819763},{features:[[4,2,4,2,-1.],[4,3,4,1,2.]],threshold:-1.2201230274513364e-003,right_val:0.5481644868850708,left_val:0.2975570857524872},{features:[[12,6,4,3,-1.],[12,7,4,1,3.]],threshold:0.0101605998352170,right_val:0.8182697892189026,left_val:0.4888817965984345},{features:[[5,0,6,4,-1.],[7,0,2,4,3.]],threshold:-0.0161745697259903,right_val:0.5239992737770081,left_val:0.1481492966413498},{features:[[9,7,3,8,-1.],[10,7,1,8,3.]],threshold:0.0192924607545137,right_val:0.7378190755844116,left_val:0.4786309897899628},{features:[[9,7,2,2,-1.],[10,7,1,2,2.]],threshold:-3.2479539513587952e-003,right_val:0.4470643997192383,left_val:0.7374222874641419},{features:[[6,7,14,4,-1.],[13,7,7,2,2.],[6,9,7,2,2.]],threshold:-9.3803480267524719e-003,right_val:0.5537996292114258,left_val:0.3489154875278473},{features:[[0,5,3,6,-1.],[0,7,3,2,3.]],threshold:-0.0126061299815774,right_val:0.5315443277359009,left_val:0.2379686981439591},{features:[[13,11,3,4,-1.],[13,13,3,2,2.]],threshold:-0.0256219301372766,right_val:0.5138769745826721,left_val:0.1964688003063202},{features:[[4,11,3,4,-1.],[4,13,3,2,2.]],threshold:-7.5741496402770281e-005,right_val:0.3365853130817413,left_val:0.5590522885322571},{features:[[5,9,12,8,-1.],[11,9,6,4,2.],[5,13,6,4,2.]],threshold:-0.0892108827829361,right_val:0.5162634849548340,left_val:0.0634046569466591},{features:[[9,12,1,3,-1.],[9,13,1,1,3.]],threshold:-2.7670480776578188e-003,right_val:0.4490706026554108,left_val:0.7323467731475830},{features:[[10,15,2,4,-1.],[10,17,2,2,2.]],threshold:2.7152578695677221e-004,right_val:0.5985518097877502,left_val:0.4114834964275360}],threshold:23.9187908172607420},{simpleClassifiers:[{features:[[7,7,6,1,-1.],[9,7,2,1,3.]],threshold:1.4786219689995050e-003,right_val:0.6643316745758057,left_val:0.2663545012474060},{features:[[12,3,6,6,-1.],[15,3,3,3,2.],[12,6,3,3,2.]],threshold:-1.8741659587249160e-003,right_val:0.2518512904644013,left_val:0.6143848896026611},{features:[[0,4,10,6,-1.],[0,6,10,2,3.]],threshold:-1.7151009524241090e-003,right_val:0.2397463023662567,left_val:0.5766341090202332},{features:[[8,3,8,14,-1.],[12,3,4,7,2.],[8,10,4,7,2.]],threshold:-1.8939269939437509e-003,right_val:0.2529144883155823,left_val:0.5682045817375183},{features:[[4,4,7,15,-1.],[4,9,7,5,3.]],threshold:-5.3006052039563656e-003,right_val:0.5556079745292664,left_val:0.1640675961971283},{features:[[12,2,6,8,-1.],[15,2,3,4,2.],[12,6,3,4,2.]],threshold:-0.0466625317931175,right_val:0.4762830138206482,left_val:0.6123154163360596},{features:[[2,2,6,8,-1.],[2,2,3,4,2.],[5,6,3,4,2.]],threshold:-7.9431332414969802e-004,right_val:0.2839404046535492,left_val:0.5707858800888062},{features:[[2,13,18,7,-1.],[8,13,6,7,3.]],threshold:0.0148916700854898,right_val:0.6006367206573486,left_val:0.4089672863483429},{features:[[4,3,8,14,-1.],[4,3,4,7,2.],[8,10,4,7,2.]],threshold:-1.2046529445797205e-003,right_val:0.2705289125442505,left_val:0.5712450742721558},{features:[[18,1,2,6,-1.],[18,3,2,2,3.]],threshold:6.0619381256401539e-003,right_val:0.3262225985527039,left_val:0.5262504220008850},{features:[[9,11,2,3,-1.],[9,12,2,1,3.]],threshold:-2.5286648888140917e-003,right_val:0.4199256896972656,left_val:0.6853830814361572},{features:[[18,1,2,6,-1.],[18,3,2,2,3.]],threshold:-5.9010218828916550e-003,right_val:0.5434812903404236,left_val:0.3266282081604004},{features:[[0,1,2,6,-1.],[0,3,2,2,3.]],threshold:5.6702760048210621e-003,right_val:0.2319003939628601,left_val:0.5468410849571228},{features:[[1,5,18,6,-1.],[1,7,18,2,3.]],threshold:-3.0304100364446640e-003,right_val:0.2708238065242767,left_val:0.5570667982101440},{features:[[0,2,6,7,-1.],[3,2,3,7,2.]],threshold:2.9803649522364140e-003,right_val:0.5890625715255737,left_val:0.3700568974018097},{features:[[7,3,6,14,-1.],[7,10,6,7,2.]],threshold:-0.0758405104279518,right_val:0.5419948101043701,left_val:0.2140070050954819},{features:[[3,7,13,10,-1.],[3,12,13,5,2.]],threshold:0.0192625392228365,right_val:0.2726590037345886,left_val:0.5526772141456604},{features:[[11,15,2,2,-1.],[11,16,2,1,2.]],threshold:1.8888259364757687e-004,right_val:0.6017209887504578,left_val:0.3958011865615845},{features:[[2,11,16,4,-1.],[2,11,8,2,2.],[10,13,8,2,2.]],threshold:0.0293695498257875,right_val:0.1435758024454117,left_val:0.5241373777389526},{features:[[13,7,6,4,-1.],[16,7,3,2,2.],[13,9,3,2,2.]],threshold:1.0417619487270713e-003,right_val:0.5929983258247376,left_val:0.3385409116744995},{features:[[6,10,3,9,-1.],[6,13,3,3,3.]],threshold:2.6125640142709017e-003,right_val:0.3021597862243652,left_val:0.5485377907752991},{features:[[14,6,1,6,-1.],[14,9,1,3,2.]],threshold:9.6977467183023691e-004,right_val:0.5532032847404480,left_val:0.3375276029109955},{features:[[5,10,4,1,-1.],[7,10,2,1,2.]],threshold:5.9512659208849072e-004,right_val:0.3359399139881134,left_val:0.5631743073463440},{features:[[3,8,15,5,-1.],[8,8,5,5,3.]],threshold:-0.1015655994415283,right_val:0.5230425000190735,left_val:0.0637350380420685},{features:[[1,6,5,4,-1.],[1,8,5,2,2.]],threshold:0.0361566990613937,right_val:0.1029528975486755,left_val:0.5136963129043579},{features:[[3,1,17,6,-1.],[3,3,17,2,3.]],threshold:3.4624140243977308e-003,right_val:0.5558289289474487,left_val:0.3879320025444031},{features:[[6,7,8,2,-1.],[10,7,4,2,2.]],threshold:0.0195549800992012,right_val:0.1875859946012497,left_val:0.5250086784362793},{features:[[9,7,3,2,-1.],[10,7,1,2,3.]],threshold:-2.3121440317481756e-003,right_val:0.4679641127586365,left_val:0.6672028899192810},{features:[[8,7,3,2,-1.],[9,7,1,2,3.]],threshold:-1.8605289515107870e-003,right_val:0.4334670901298523,left_val:0.7163379192352295},{features:[[8,9,4,2,-1.],[8,10,4,1,2.]],threshold:-9.4026362057775259e-004,right_val:0.5650203227996826,left_val:0.3021360933780670},{features:[[8,8,4,3,-1.],[8,9,4,1,3.]],threshold:-5.2418331615626812e-003,right_val:0.5250256061553955,left_val:0.1820009052753449},{features:[[9,5,6,4,-1.],[9,5,3,4,2.]],threshold:1.1729019752237946e-004,right_val:0.5445973277091980,left_val:0.3389188051223755},{features:[[8,13,4,3,-1.],[8,14,4,1,3.]],threshold:1.1878840159624815e-003,right_val:0.6253563165664673,left_val:0.4085349142551422},{features:[[4,7,12,6,-1.],[10,7,6,3,2.],[4,10,6,3,2.]],threshold:-0.0108813596889377,right_val:0.5700082778930664,left_val:0.3378399014472961},{features:[[8,14,4,3,-1.],[8,15,4,1,3.]],threshold:1.7354859737679362e-003,right_val:0.6523038744926453,left_val:0.4204635918140411},{features:[[9,7,3,3,-1.],[9,8,3,1,3.]],threshold:-6.5119052305817604e-003,right_val:0.5428143739700317,left_val:0.2595216035842896},{features:[[7,4,3,8,-1.],[8,4,1,8,3.]],threshold:-1.2136430013924837e-003,right_val:0.3977893888950348,left_val:0.6165143847465515},{features:[[10,0,3,6,-1.],[11,0,1,6,3.]],threshold:-0.0103542404249310,right_val:0.5219504833221436,left_val:0.1628028005361557},{features:[[6,3,4,8,-1.],[8,3,2,8,2.]],threshold:5.5858830455690622e-004,right_val:0.5503574013710022,left_val:0.3199650943279266},{features:[[14,3,6,13,-1.],[14,3,3,13,2.]],threshold:0.0152996499091387,right_val:0.6122388243675232,left_val:0.4103994071483612},{features:[[8,13,3,6,-1.],[8,16,3,3,2.]],threshold:-0.0215882100164890,right_val:0.5197384953498840,left_val:0.1034912988543510},{features:[[14,3,6,13,-1.],[14,3,3,13,2.]],threshold:-0.1283462941646576,right_val:0.4893102943897247,left_val:0.8493865132331848},{features:[[0,7,10,4,-1.],[0,7,5,2,2.],[5,9,5,2,2.]],threshold:-2.2927189711481333e-003,right_val:0.5471575260162354,left_val:0.3130157887935638},{features:[[14,3,6,13,-1.],[14,3,3,13,2.]],threshold:0.0799151062965393,right_val:0.6073989272117615,left_val:0.4856320917606354},{features:[[0,3,6,13,-1.],[3,3,3,13,2.]],threshold:-0.0794410929083824,right_val:0.4624533057212830,left_val:0.8394674062728882},{features:[[9,1,4,1,-1.],[9,1,2,1,2.]],threshold:-5.2800010889768600e-003,right_val:0.5306698083877564,left_val:0.1881695985794067},{features:[[8,0,2,1,-1.],[9,0,1,1,2.]],threshold:1.0463109938427806e-003,right_val:0.2583065927028656,left_val:0.5271229147911072},{features:[[10,16,4,4,-1.],[12,16,2,2,2.],[10,18,2,2,2.]],threshold:2.6317298761568964e-004,right_val:0.5735440850257874,left_val:0.4235304892063141},{features:[[9,6,2,3,-1.],[10,6,1,3,2.]],threshold:-3.6173160187900066e-003,right_val:0.4495444893836975,left_val:0.6934396028518677},{features:[[4,5,12,2,-1.],[8,5,4,2,3.]],threshold:0.0114218797534704,right_val:0.4138193130493164,left_val:0.5900921225547791},{features:[[8,7,3,5,-1.],[9,7,1,5,3.]],threshold:-1.9963278900831938e-003,right_val:0.4327239990234375,left_val:0.6466382741928101}],threshold:24.5278797149658200},{simpleClassifiers:[{features:[[6,4,8,6,-1.],[6,6,8,2,3.]],threshold:-9.9691245704889297e-003,right_val:0.2482212036848068,left_val:0.6142324209213257},{features:[[9,5,2,12,-1.],[9,11,2,6,2.]],threshold:7.3073059320449829e-004,right_val:0.2321965992450714,left_val:0.5704951882362366},{features:[[4,6,6,8,-1.],[4,10,6,4,2.]],threshold:6.4045301405712962e-004,right_val:0.5814933180809021,left_val:0.2112251967191696},{features:[[12,2,8,5,-1.],[12,2,4,5,2.]],threshold:4.5424019917845726e-003,right_val:0.5866311788558960,left_val:0.2950482070446014},{features:[[0,8,18,3,-1.],[0,9,18,1,3.]],threshold:9.2477443104144186e-005,right_val:0.5791326761245728,left_val:0.2990990877151489},{features:[[8,12,4,8,-1.],[8,16,4,4,2.]],threshold:-8.6603146046400070e-003,right_val:0.5635542273521423,left_val:0.2813029885292053},{features:[[0,2,8,5,-1.],[4,2,4,5,2.]],threshold:8.0515816807746887e-003,right_val:0.6054757237434387,left_val:0.3535369038581848},{features:[[13,11,3,4,-1.],[13,13,3,2,2.]],threshold:4.3835240649059415e-004,right_val:0.2731510996818543,left_val:0.5596532225608826},{features:[[5,11,6,1,-1.],[7,11,2,1,3.]],threshold:-9.8168973636347800e-005,right_val:0.3638561069965363,left_val:0.5978031754493713},{features:[[11,3,3,1,-1.],[12,3,1,1,3.]],threshold:-1.1298790341243148e-003,right_val:0.5432729125022888,left_val:0.2755252122879028},{features:[[7,13,5,3,-1.],[7,14,5,1,3.]],threshold:6.4356150105595589e-003,right_val:0.7069833278656006,left_val:0.4305641949176788},{features:[[11,11,7,6,-1.],[11,14,7,3,2.]],threshold:-0.0568293295800686,right_val:0.5294997096061707,left_val:0.2495242953300476},{features:[[2,11,7,6,-1.],[2,14,7,3,2.]],threshold:4.0668169967830181e-003,right_val:0.2497723996639252,left_val:0.5478553175926209},{features:[[12,14,2,6,-1.],[12,16,2,2,3.]],threshold:4.8164798499783501e-005,right_val:0.5706356167793274,left_val:0.3938601016998291},{features:[[8,14,3,3,-1.],[8,15,3,1,3.]],threshold:6.1795017682015896e-003,right_val:0.7394766807556152,left_val:0.4407606124877930},{features:[[11,0,3,5,-1.],[12,0,1,5,3.]],threshold:6.4985752105712891e-003,right_val:0.2479152977466583,left_val:0.5445243120193481},{features:[[6,1,4,9,-1.],[8,1,2,9,2.]],threshold:-1.0211090557277203e-003,right_val:0.5338971018791199,left_val:0.2544766962528229},{features:[[10,3,6,1,-1.],[12,3,2,1,3.]],threshold:-5.4247528314590454e-003,right_val:0.5324069261550903,left_val:0.2718858122825623},{features:[[8,8,3,4,-1.],[8,10,3,2,2.]],threshold:-1.0559899965301156e-003,right_val:0.5534508824348450,left_val:0.3178288042545319},{features:[[8,12,4,2,-1.],[8,13,4,1,2.]],threshold:6.6465808777138591e-004,right_val:0.6558194160461426,left_val:0.4284219145774841},{features:[[5,18,4,2,-1.],[5,19,4,1,2.]],threshold:-2.7524109464138746e-004,right_val:0.3810262978076935,left_val:0.5902860760688782},{features:[[2,1,18,6,-1.],[2,3,18,2,3.]],threshold:4.2293202131986618e-003,right_val:0.5709385871887207,left_val:0.3816489875316620},{features:[[6,0,3,2,-1.],[7,0,1,2,3.]],threshold:-3.2868210691958666e-003,right_val:0.5259544253349304,left_val:0.1747743934392929},{features:[[13,8,6,2,-1.],[16,8,3,1,2.],[13,9,3,1,2.]],threshold:1.5611879643984139e-004,right_val:0.5725612044334412,left_val:0.3601722121238709},{features:[[6,10,3,6,-1.],[6,13,3,3,2.]],threshold:-7.3621381488919724e-006,right_val:0.3044497072696686,left_val:0.5401858091354370},{features:[[0,13,20,4,-1.],[10,13,10,2,2.],[0,15,10,2,2.]],threshold:-0.0147672500461340,right_val:0.5573434829711914,left_val:0.3220770061016083},{features:[[7,7,6,5,-1.],[9,7,2,5,3.]],threshold:0.0244895908981562,right_val:0.6518812775611877,left_val:0.4301528036594391},{features:[[11,0,2,2,-1.],[11,1,2,1,2.]],threshold:-3.7652091123163700e-004,right_val:0.5598236918449402,left_val:0.3564583063125610},{features:[[1,8,6,2,-1.],[1,8,3,1,2.],[4,9,3,1,2.]],threshold:7.3657688517414499e-006,right_val:0.5561897754669190,left_val:0.3490782976150513},{features:[[0,2,20,2,-1.],[10,2,10,1,2.],[0,3,10,1,2.]],threshold:-0.0150999398902059,right_val:0.5335299968719482,left_val:0.1776272058486939},{features:[[7,14,5,3,-1.],[7,15,5,1,3.]],threshold:-3.8316650316119194e-003,right_val:0.4221394062042236,left_val:0.6149687767028809},{features:[[7,13,6,6,-1.],[10,13,3,3,2.],[7,16,3,3,2.]],threshold:0.0169254001230001,right_val:0.2166585028171539,left_val:0.5413014888763428},{features:[[9,12,2,3,-1.],[9,13,2,1,3.]],threshold:-3.0477850232273340e-003,right_val:0.4354617893695831,left_val:0.6449490785598755},{features:[[16,11,1,6,-1.],[16,13,1,2,3.]],threshold:3.2140589319169521e-003,right_val:0.3523217141628265,left_val:0.5400155186653137},{features:[[3,11,1,6,-1.],[3,13,1,2,3.]],threshold:-4.0023201145231724e-003,right_val:0.5338417291641235,left_val:0.2774524092674255},{features:[[4,4,14,12,-1.],[11,4,7,6,2.],[4,10,7,6,2.]],threshold:7.4182129465043545e-003,right_val:0.3702817857265472,left_val:0.5676739215850830},{features:[[5,4,3,3,-1.],[5,5,3,1,3.]],threshold:-8.8764587417244911e-003,right_val:0.4583688974380493,left_val:0.7749221920967102},{features:[[12,3,3,3,-1.],[13,3,1,3,3.]],threshold:2.7311739977449179e-003,right_val:0.3996661007404327,left_val:0.5338721871376038},{features:[[6,6,8,3,-1.],[6,7,8,1,3.]],threshold:-2.5082379579544067e-003,right_val:0.3777498900890350,left_val:0.5611963272094727},{features:[[12,3,3,3,-1.],[13,3,1,3,3.]],threshold:-8.0541074275970459e-003,right_val:0.5179182887077332,left_val:0.2915228903293610},{features:[[3,1,4,10,-1.],[3,1,2,5,2.],[5,6,2,5,2.]],threshold:-9.7938813269138336e-004,right_val:0.3700192868709564,left_val:0.5536432862281799},{features:[[5,7,10,2,-1.],[5,7,5,2,2.]],threshold:-5.8745909482240677e-003,right_val:0.5679376125335693,left_val:0.3754391074180603},{features:[[8,7,3,3,-1.],[9,7,1,3,3.]],threshold:-4.4936719350516796e-003,right_val:0.4480949938297272,left_val:0.7019699215888977},{features:[[15,12,2,3,-1.],[15,13,2,1,3.]],threshold:-5.4389229044318199e-003,right_val:0.5313386917114258,left_val:0.2310364991426468},{features:[[7,8,3,4,-1.],[8,8,1,4,3.]],threshold:-7.5094640487805009e-004,right_val:0.4129343032836914,left_val:0.5864868760108948},{features:[[13,4,1,12,-1.],[13,10,1,6,2.]],threshold:1.4528800420521293e-005,right_val:0.5619621276855469,left_val:0.3732407093048096},{features:[[4,5,12,12,-1.],[4,5,6,6,2.],[10,11,6,6,2.]],threshold:0.0407580696046352,right_val:0.2720521986484528,left_val:0.5312091112136841},{features:[[7,14,7,3,-1.],[7,15,7,1,3.]],threshold:6.6505931317806244e-003,right_val:0.6693493723869324,left_val:0.4710015952587128},{features:[[3,12,2,3,-1.],[3,13,2,1,3.]],threshold:4.5759351924061775e-003,right_val:0.1637275964021683,left_val:0.5167819261550903},{features:[[3,2,14,2,-1.],[10,2,7,1,2.],[3,3,7,1,2.]],threshold:6.5269311890006065e-003,right_val:0.2938531935214996,left_val:0.5397608876228333},{features:[[0,1,3,10,-1.],[1,1,1,10,3.]],threshold:-0.0136603796854615,right_val:0.4532200098037720,left_val:0.7086488008499146},{features:[[9,0,6,5,-1.],[11,0,2,5,3.]],threshold:0.0273588690906763,right_val:0.3589231967926025,left_val:0.5206481218338013},{features:[[5,7,6,2,-1.],[8,7,3,2,2.]],threshold:6.2197551596909761e-004,right_val:0.5441123247146606,left_val:0.3507075905799866},{features:[[7,1,6,10,-1.],[7,6,6,5,2.]],threshold:-3.3077080734074116e-003,right_val:0.4024891853332520,left_val:0.5859522819519043},{features:[[1,1,18,3,-1.],[7,1,6,3,3.]],threshold:-0.0106311095878482,right_val:0.4422602951526642,left_val:0.6743267178535461},{features:[[16,3,3,6,-1.],[16,5,3,2,3.]],threshold:0.0194416493177414,right_val:0.1797904968261719,left_val:0.5282716155052185}],threshold:27.1533508300781250},{simpleClassifiers:[{features:[[6,3,7,6,-1.],[6,6,7,3,2.]],threshold:-5.5052167735993862e-003,right_val:0.2626559138298035,left_val:0.5914731025695801},{features:[[4,7,12,2,-1.],[8,7,4,2,3.]],threshold:1.9562279339879751e-003,right_val:0.5741627216339111,left_val:0.2312581986188889},{features:[[0,4,17,10,-1.],[0,9,17,5,2.]],threshold:-8.8924784213304520e-003,right_val:0.5626654028892517,left_val:0.1656530052423477},{features:[[3,4,15,16,-1.],[3,12,15,8,2.]],threshold:0.0836383774876595,right_val:0.1957294940948486,left_val:0.5423449873924255},{features:[[7,15,6,4,-1.],[7,17,6,2,2.]],threshold:1.2282270472496748e-003,right_val:0.5992503762245178,left_val:0.3417904078960419},{features:[[15,2,4,9,-1.],[15,2,2,9,2.]],threshold:5.7629169896245003e-003,right_val:0.6079903841018677,left_val:0.3719581961631775},{features:[[2,3,3,2,-1.],[2,4,3,1,2.]],threshold:-1.6417410224676132e-003,right_val:0.5576915740966797,left_val:0.2577486038208008},{features:[[13,6,7,9,-1.],[13,9,7,3,3.]],threshold:3.4113149158656597e-003,right_val:0.5514171719551086,left_val:0.2950749099254608},{features:[[8,11,4,3,-1.],[8,12,4,1,3.]],threshold:-0.0110693201422691,right_val:0.4477078914642334,left_val:0.7569358944892883},{features:[[0,2,20,6,-1.],[10,2,10,3,2.],[0,5,10,3,2.]],threshold:0.0348659716546535,right_val:0.2669621109962463,left_val:0.5583708882331848},{features:[[3,2,6,10,-1.],[3,2,3,5,2.],[6,7,3,5,2.]],threshold:6.5701099811121821e-004,right_val:0.2988890111446381,left_val:0.5627313256263733},{features:[[13,10,3,4,-1.],[13,12,3,2,2.]],threshold:-0.0243391301482916,right_val:0.5108863115310669,left_val:0.2771185040473938},{features:[[4,10,3,4,-1.],[4,12,3,2,2.]],threshold:5.9435202274471521e-004,right_val:0.3120341897010803,left_val:0.5580651760101318},{features:[[7,5,6,3,-1.],[9,5,2,3,3.]],threshold:2.2971509024500847e-003,right_val:0.5679075717926025,left_val:0.3330250084400177},{features:[[7,6,6,8,-1.],[7,10,6,4,2.]],threshold:-3.7801829166710377e-003,right_val:0.5344808101654053,left_val:0.2990534901618958},{features:[[0,11,20,6,-1.],[0,14,20,3,2.]],threshold:-0.1342066973447800,right_val:0.5392568111419678,left_val:0.1463858932256699},{features:[[4,13,4,6,-1.],[4,13,2,3,2.],[6,16,2,3,2.]],threshold:7.5224548345431685e-004,right_val:0.5692734718322754,left_val:0.3746953904628754},{features:[[6,0,8,12,-1.],[10,0,4,6,2.],[6,6,4,6,2.]],threshold:-0.0405455417931080,right_val:0.5484297871589661,left_val:0.2754747867584229},{features:[[2,0,15,2,-1.],[2,1,15,1,2.]],threshold:1.2572970008477569e-003,right_val:0.5756075978279114,left_val:0.3744584023952484},{features:[[9,12,2,3,-1.],[9,13,2,1,3.]],threshold:-7.4249948374927044e-003,right_val:0.4728231132030487,left_val:0.7513859272003174},{features:[[3,12,1,2,-1.],[3,13,1,1,2.]],threshold:5.0908129196614027e-004,right_val:0.2932321131229401,left_val:0.5404896736145020},{features:[[9,11,2,3,-1.],[9,12,2,1,3.]],threshold:-1.2808450264856219e-003,right_val:0.4273349046707153,left_val:0.6169779896736145},{features:[[7,3,3,1,-1.],[8,3,1,1,3.]],threshold:-1.8348860321566463e-003,right_val:0.5206472277641296,left_val:0.2048496007919312},{features:[[17,7,3,6,-1.],[17,9,3,2,3.]],threshold:0.0274848695844412,right_val:0.1675522029399872,left_val:0.5252984762191773},{features:[[7,2,3,2,-1.],[8,2,1,2,3.]],threshold:2.2372419480234385e-003,right_val:0.2777658104896545,left_val:0.5267782807350159},{features:[[11,4,5,3,-1.],[11,5,5,1,3.]],threshold:-8.8635291904211044e-003,right_val:0.4812048971652985,left_val:0.6954557895660400},{features:[[4,4,5,3,-1.],[4,5,5,1,3.]],threshold:4.1753971017897129e-003,right_val:0.6349195837974548,left_val:0.4291887879371643},{features:[[19,3,1,2,-1.],[19,4,1,1,2.]],threshold:-1.7098189564421773e-003,right_val:0.5361248850822449,left_val:0.2930536866188049},{features:[[5,5,4,3,-1.],[5,6,4,1,3.]],threshold:6.5328548662364483e-003,right_val:0.7409694194793701,left_val:0.4495325088500977},{features:[[17,7,3,6,-1.],[17,9,3,2,3.]],threshold:-9.5372907817363739e-003,right_val:0.5416501760482788,left_val:0.3149119913578033},{features:[[0,7,3,6,-1.],[0,9,3,2,3.]],threshold:0.0253109894692898,right_val:0.1311707943677902,left_val:0.5121892094612122},{features:[[14,2,6,9,-1.],[14,5,6,3,3.]],threshold:0.0364609695971012,right_val:0.2591339945793152,left_val:0.5175911784172058},{features:[[0,4,5,6,-1.],[0,6,5,2,3.]],threshold:0.0208543296903372,right_val:0.1582316011190414,left_val:0.5137140154838562},{features:[[10,5,6,2,-1.],[12,5,2,2,3.]],threshold:-8.7207747856155038e-004,right_val:0.4398978948593140,left_val:0.5574309825897217},{features:[[4,5,6,2,-1.],[6,5,2,2,3.]],threshold:-1.5227000403683633e-005,right_val:0.3708069920539856,left_val:0.5548940896987915},{features:[[8,1,4,6,-1.],[8,3,4,2,3.]],threshold:-8.4316509310156107e-004,right_val:0.5554211139678955,left_val:0.3387419879436493},{features:[[0,2,3,6,-1.],[0,4,3,2,3.]],threshold:3.6037859972566366e-003,right_val:0.3411171138286591,left_val:0.5358061790466309},{features:[[6,6,8,3,-1.],[6,7,8,1,3.]],threshold:-6.8057891912758350e-003,right_val:0.4345862865447998,left_val:0.6125202775001526},{features:[[0,1,5,9,-1.],[0,4,5,3,3.]],threshold:-0.0470216609537601,right_val:0.5193738937377930,left_val:0.2358165979385376},{features:[[16,0,4,15,-1.],[16,0,2,15,2.]],threshold:-0.0369541086256504,right_val:0.4760943949222565,left_val:0.7323111295700073},{features:[[1,10,3,2,-1.],[1,11,3,1,2.]],threshold:1.0439479956403375e-003,right_val:0.3411330878734589,left_val:0.5419455170631409},{features:[[14,4,1,10,-1.],[14,9,1,5,2.]],threshold:-2.1050689974799752e-004,right_val:0.5554947257041931,left_val:0.2821694016456604},{features:[[0,1,4,12,-1.],[2,1,2,12,2.]],threshold:-0.0808315873146057,right_val:0.4697434902191162,left_val:0.9129930138587952},{features:[[11,11,4,2,-1.],[11,11,2,2,2.]],threshold:-3.6579059087671340e-004,right_val:0.3978292942047119,left_val:0.6022670269012451},{features:[[5,11,4,2,-1.],[7,11,2,2,2.]],threshold:-1.2545920617412776e-004,right_val:0.3845539987087250,left_val:0.5613213181495667},{features:[[3,8,15,5,-1.],[8,8,5,5,3.]],threshold:-0.0687864869832993,right_val:0.5300496816635132,left_val:0.2261611968278885},{features:[[0,0,6,10,-1.],[3,0,3,10,2.]],threshold:0.0124157899990678,right_val:0.5828812122344971,left_val:0.4075691998004913},{features:[[11,4,3,2,-1.],[12,4,1,2,3.]],threshold:-4.7174817882478237e-003,right_val:0.5267757773399353,left_val:0.2827253937721252},{features:[[8,12,3,8,-1.],[8,16,3,4,2.]],threshold:0.0381368584930897,right_val:0.1023615971207619,left_val:0.5074741244316101},{features:[[8,14,5,3,-1.],[8,15,5,1,3.]],threshold:-2.8168049175292253e-003,right_val:0.4359692931175232,left_val:0.6169006824493408},{features:[[7,14,4,3,-1.],[7,15,4,1,3.]],threshold:8.1303603947162628e-003,right_val:0.7606095075607300,left_val:0.4524433016777039},{features:[[11,4,3,2,-1.],[12,4,1,2,3.]],threshold:6.0056019574403763e-003,right_val:0.1859712004661560,left_val:0.5240408778190613},{features:[[3,15,14,4,-1.],[3,15,7,2,2.],[10,17,7,2,2.]],threshold:0.0191393196582794,right_val:0.2332071959972382,left_val:0.5209379196166992},{features:[[2,2,16,4,-1.],[10,2,8,2,2.],[2,4,8,2,2.]],threshold:0.0164457596838474,right_val:0.3264234960079193,left_val:0.5450702905654907},{features:[[0,8,6,12,-1.],[3,8,3,12,2.]],threshold:-0.0373568907380104,right_val:0.4533241987228394,left_val:0.6999046802520752},{features:[[5,7,10,2,-1.],[5,7,5,2,2.]],threshold:-0.0197279006242752,right_val:0.5412809848785400,left_val:0.2653664946556091},{features:[[9,7,2,5,-1.],[10,7,1,5,2.]],threshold:6.6972579807043076e-003,right_val:0.7138652205467224,left_val:0.4480566084384918},{features:[[13,7,6,4,-1.],[16,7,3,2,2.],[13,9,3,2,2.]],threshold:7.4457528535276651e-004,right_val:0.5471320152282715,left_val:0.4231350123882294},{features:[[0,13,8,2,-1.],[0,14,8,1,2.]],threshold:1.1790640419349074e-003,right_val:0.3130455017089844,left_val:0.5341702103614807},{features:[[13,7,6,4,-1.],[16,7,3,2,2.],[13,9,3,2,2.]],threshold:0.0349806100130081,right_val:0.3430530130863190,left_val:0.5118659734725952},{features:[[1,7,6,4,-1.],[1,7,3,2,2.],[4,9,3,2,2.]],threshold:5.6859792675822973e-004,right_val:0.5468639731407166,left_val:0.3532187044620514},{features:[[12,6,1,12,-1.],[12,12,1,6,2.]],threshold:-0.0113406497985125,right_val:0.5348700881004334,left_val:0.2842353880405426},{features:[[9,5,2,6,-1.],[10,5,1,6,2.]],threshold:-6.6228108480572701e-003,right_val:0.4492664933204651,left_val:0.6883640289306641},{features:[[14,12,2,3,-1.],[14,13,2,1,3.]],threshold:-8.0160330981016159e-003,right_val:0.5224308967590332,left_val:0.1709893941879273},{features:[[4,12,2,3,-1.],[4,13,2,1,3.]],threshold:1.4206819469109178e-003,right_val:0.2993383109569550,left_val:0.5290846228599548},{features:[[8,12,4,3,-1.],[8,13,4,1,3.]],threshold:-2.7801711112260818e-003,right_val:0.4460499882698059,left_val:0.6498854160308838},{features:[[5,2,2,4,-1.],[5,2,1,2,2.],[6,4,1,2,2.]],threshold:-1.4747589593753219e-003,right_val:0.5388113260269165,left_val:0.3260438144207001},{features:[[5,5,11,3,-1.],[5,6,11,1,3.]],threshold:-0.0238303393125534,right_val:0.4801219999790192,left_val:0.7528941035270691},{features:[[7,6,4,12,-1.],[7,12,4,6,2.]],threshold:6.9369790144264698e-003,right_val:0.3261427879333496,left_val:0.5335165858268738},{features:[[12,13,8,5,-1.],[12,13,4,5,2.]],threshold:8.2806255668401718e-003,right_val:0.5737829804420471,left_val:0.4580394029617310},{features:[[7,6,1,12,-1.],[7,12,1,6,2.]],threshold:-0.0104395002126694,right_val:0.5233827829360962,left_val:0.2592320144176483}],threshold:34.5541114807128910},{simpleClassifiers:[{features:[[1,2,6,3,-1.],[4,2,3,3,2.]],threshold:7.2006587870419025e-003,right_val:0.6849808096885681,left_val:0.3258886039257050},{features:[[9,5,6,10,-1.],[12,5,3,5,2.],[9,10,3,5,2.]],threshold:-2.8593589086085558e-003,right_val:0.2537829875946045,left_val:0.5838881134986877},{features:[[5,5,8,12,-1.],[5,5,4,6,2.],[9,11,4,6,2.]],threshold:6.8580528022721410e-004,right_val:0.2812424004077911,left_val:0.5708081722259522},{features:[[0,7,20,6,-1.],[0,9,20,2,3.]],threshold:7.9580191522836685e-003,right_val:0.5544260740280151,left_val:0.2501051127910614},{features:[[4,2,2,2,-1.],[4,3,2,1,2.]],threshold:-1.2124150525778532e-003,right_val:0.5433350205421448,left_val:0.2385368049144745},{features:[[4,18,12,2,-1.],[8,18,4,2,3.]],threshold:7.9426132142543793e-003,right_val:0.6220757961273193,left_val:0.3955070972442627},{features:[[7,4,4,16,-1.],[7,12,4,8,2.]],threshold:2.4630590341985226e-003,right_val:0.2992357909679413,left_val:0.5639708042144775},{features:[[7,6,7,8,-1.],[7,10,7,4,2.]],threshold:-6.0396599583327770e-003,right_val:0.5411676764488220,left_val:0.2186512947082520},{features:[[6,3,3,1,-1.],[7,3,1,1,3.]],threshold:-1.2988339876756072e-003,right_val:0.5364584922790527,left_val:0.2350706011056900},{features:[[11,15,2,4,-1.],[11,17,2,2,2.]],threshold:2.2299369447864592e-004,right_val:0.5729606151580811,left_val:0.3804112970829010},{features:[[3,5,4,8,-1.],[3,9,4,4,2.]],threshold:1.4654280385002494e-003,right_val:0.5258268713951111,left_val:0.2510167956352234},{features:[[7,1,6,12,-1.],[7,7,6,6,2.]],threshold:-8.1210042117163539e-004,right_val:0.3851158916950226,left_val:0.5992823839187622},{features:[[4,6,6,2,-1.],[6,6,2,2,3.]],threshold:-1.3836020370945334e-003,right_val:0.3636586964130402,left_val:0.5681396126747131},{features:[[16,4,4,6,-1.],[16,6,4,2,3.]],threshold:-0.0279364492744207,right_val:0.5377560257911682,left_val:0.1491317003965378},{features:[[3,3,5,2,-1.],[3,4,5,1,2.]],threshold:-4.6919551095925272e-004,right_val:0.5572484731674194,left_val:0.3692429959774017},{features:[[9,11,2,3,-1.],[9,12,2,1,3.]],threshold:-4.9829659983515739e-003,right_val:0.4532504081726074,left_val:0.6758509278297424},{features:[[2,16,4,2,-1.],[2,17,4,1,2.]],threshold:1.8815309740602970e-003,right_val:0.2932539880275726,left_val:0.5368022918701172},{features:[[7,13,6,6,-1.],[10,13,3,3,2.],[7,16,3,3,2.]],threshold:-0.0190675500780344,right_val:0.5330067276954651,left_val:0.1649377048015595},{features:[[7,0,3,4,-1.],[8,0,1,4,3.]],threshold:-4.6906559728085995e-003,right_val:0.5119361877441406,left_val:0.1963925957679749},{features:[[8,15,4,3,-1.],[8,16,4,1,3.]],threshold:5.9777139686048031e-003,right_val:0.7008398175239563,left_val:0.4671171903610230},{features:[[0,4,4,6,-1.],[0,6,4,2,3.]],threshold:-0.0333031304180622,right_val:0.5104162096977234,left_val:0.1155416965484619},{features:[[5,6,12,3,-1.],[9,6,4,3,3.]],threshold:0.0907441079616547,right_val:0.1306173056364059,left_val:0.5149660110473633},{features:[[7,6,6,14,-1.],[9,6,2,14,3.]],threshold:9.3555898638442159e-004,right_val:0.5439859032630920,left_val:0.3605481088161469},{features:[[9,7,3,3,-1.],[10,7,1,3,3.]],threshold:0.0149016501381993,right_val:0.7687569856643677,left_val:0.4886212050914764},{features:[[6,12,2,4,-1.],[6,14,2,2,2.]],threshold:6.1594118596985936e-004,right_val:0.3240939080715179,left_val:0.5356813073158264},{features:[[10,12,7,6,-1.],[10,14,7,2,3.]],threshold:-0.0506709888577461,right_val:0.5230404138565064,left_val:0.1848621964454651},{features:[[1,0,15,2,-1.],[1,1,15,1,2.]],threshold:6.8665749859064817e-004,right_val:0.5517945885658264,left_val:0.3840579986572266},{features:[[14,0,6,6,-1.],[14,0,3,6,2.]],threshold:8.3712432533502579e-003,right_val:0.6131753921508789,left_val:0.4288564026355743},{features:[[5,3,3,1,-1.],[6,3,1,1,3.]],threshold:-1.2953069526702166e-003,right_val:0.5280737876892090,left_val:0.2913674116134644},{features:[[14,0,6,6,-1.],[14,0,3,6,2.]],threshold:-0.0419416800141335,right_val:0.4856030941009522,left_val:0.7554799914360046},{features:[[0,3,20,10,-1.],[0,8,20,5,2.]],threshold:-0.0235293805599213,right_val:0.5256081223487854,left_val:0.2838279902935028},{features:[[14,0,6,6,-1.],[14,0,3,6,2.]],threshold:0.0408574491739273,right_val:0.6277297139167786,left_val:0.4870935082435608},{features:[[0,0,6,6,-1.],[3,0,3,6,2.]],threshold:-0.0254068691283464,right_val:0.4575029015541077,left_val:0.7099707722663879},{features:[[19,15,1,2,-1.],[19,16,1,1,2.]],threshold:-4.1415440500713885e-004,right_val:0.5469412207603455,left_val:0.4030886888504028},{features:[[0,2,4,8,-1.],[2,2,2,8,2.]],threshold:0.0218241196125746,right_val:0.6768701076507568,left_val:0.4502024054527283},{features:[[2,1,18,4,-1.],[11,1,9,2,2.],[2,3,9,2,2.]],threshold:0.0141140399500728,right_val:0.3791700005531311,left_val:0.5442860722541809},{features:[[8,12,1,2,-1.],[8,13,1,1,2.]],threshold:6.7214590671937913e-005,right_val:0.5873476266860962,left_val:0.4200463891029358},{features:[[5,2,10,6,-1.],[10,2,5,3,2.],[5,5,5,3,2.]],threshold:-7.9417638480663300e-003,right_val:0.5585265755653381,left_val:0.3792561888694763},{features:[[9,7,2,4,-1.],[10,7,1,4,2.]],threshold:-7.2144409641623497e-003,right_val:0.4603548943996429,left_val:0.7253103852272034},{features:[[9,7,3,3,-1.],[10,7,1,3,3.]],threshold:2.5817339774221182e-003,right_val:0.5900238752365112,left_val:0.4693301916122437},{features:[[4,5,12,8,-1.],[8,5,4,8,3.]],threshold:0.1340931951999664,right_val:0.1808844953775406,left_val:0.5149213075637817},{features:[[15,15,4,3,-1.],[15,16,4,1,3.]],threshold:2.2962710354477167e-003,right_val:0.3717867136001587,left_val:0.5399743914604187},{features:[[8,18,3,1,-1.],[9,18,1,1,3.]],threshold:-2.1575849968940020e-003,right_val:0.5148863792419434,left_val:0.2408495992422104},{features:[[9,13,4,3,-1.],[9,14,4,1,3.]],threshold:-4.9196188338100910e-003,right_val:0.4738740026950836,left_val:0.6573588252067566},{features:[[7,13,4,3,-1.],[7,14,4,1,3.]],threshold:1.6267469618469477e-003,right_val:0.6303114295005798,left_val:0.4192821979522705},{features:[[19,15,1,2,-1.],[19,16,1,1,2.]],threshold:3.3413388882763684e-004,right_val:0.3702101111412048,left_val:0.5540298223495483},{features:[[0,15,8,4,-1.],[0,17,8,2,2.]],threshold:-0.0266980808228254,right_val:0.5101410746574402,left_val:0.1710917949676514},{features:[[9,3,6,4,-1.],[11,3,2,4,3.]],threshold:-0.0305618792772293,right_val:0.5168793797492981,left_val:0.1904218047857285},{features:[[8,14,4,3,-1.],[8,15,4,1,3.]],threshold:2.8511548880487680e-003,right_val:0.6313853859901428,left_val:0.4447506964206696},{features:[[3,14,14,6,-1.],[3,16,14,2,3.]],threshold:-0.0362114794552326,right_val:0.5377349257469177,left_val:0.2490727007389069},{features:[[6,3,6,6,-1.],[6,6,6,3,2.]],threshold:-2.4115189444273710e-003,right_val:0.3664236962795258,left_val:0.5381243228912354},{features:[[5,11,10,6,-1.],[5,14,10,3,2.]],threshold:-7.7253201743587852e-004,right_val:0.3541550040245056,left_val:0.5530232191085815},{features:[[3,10,3,4,-1.],[4,10,1,4,3.]],threshold:2.9481729143299162e-004,right_val:0.5667243003845215,left_val:0.4132699072360992},{features:[[13,9,2,2,-1.],[13,9,1,2,2.]],threshold:-6.2334560789167881e-003,right_val:0.5198668837547302,left_val:0.0987872332334518},{features:[[5,3,6,4,-1.],[7,3,2,4,3.]],threshold:-0.0262747295200825,right_val:0.5028107166290283,left_val:0.0911274924874306},{features:[[9,7,3,3,-1.],[10,7,1,3,3.]],threshold:5.3212260827422142e-003,right_val:0.6222720742225647,left_val:0.4726648926734924},{features:[[2,12,2,3,-1.],[2,13,2,1,3.]],threshold:-4.1129058226943016e-003,right_val:0.5137804746627808,left_val:0.2157457023859024},{features:[[9,8,3,12,-1.],[9,12,3,4,3.]],threshold:3.2457809429615736e-003,right_val:0.3721776902675629,left_val:0.5410770773887634},{features:[[3,14,4,6,-1.],[3,14,2,3,2.],[5,17,2,3,2.]],threshold:-0.0163597092032433,right_val:0.4685291945934296,left_val:0.7787874937057495},{features:[[16,15,2,2,-1.],[16,16,2,1,2.]],threshold:3.2166109303943813e-004,right_val:0.4240373969078064,left_val:0.5478987097740173},{features:[[2,15,2,2,-1.],[2,16,2,1,2.]],threshold:6.4452440710738301e-004,right_val:0.3501324951648712,left_val:0.5330560803413391},{features:[[8,12,4,3,-1.],[8,13,4,1,3.]],threshold:-7.8909732401371002e-003,right_val:0.4726569056510925,left_val:0.6923521161079407},{features:[[0,7,20,1,-1.],[10,7,10,1,2.]],threshold:0.0483362115919590,right_val:0.0757492035627365,left_val:0.5055900216102600},{features:[[7,6,8,3,-1.],[7,6,4,3,2.]],threshold:-7.5178127735853195e-004,right_val:0.5538573861122131,left_val:0.3783741891384125},{features:[[5,7,8,2,-1.],[9,7,4,2,2.]],threshold:-2.4953910615295172e-003,right_val:0.5359612107276917,left_val:0.3081651031970978},{features:[[9,7,3,5,-1.],[10,7,1,5,3.]],threshold:-2.2385010961443186e-003,right_val:0.4649342894554138,left_val:0.6633958816528320},{features:[[8,7,3,5,-1.],[9,7,1,5,3.]],threshold:-1.7988430336117744e-003,right_val:0.4347187876701355,left_val:0.6596844792366028},{features:[[11,1,3,5,-1.],[12,1,1,5,3.]],threshold:8.7860915809869766e-003,right_val:0.2315579950809479,left_val:0.5231832861900330},{features:[[6,2,3,6,-1.],[7,2,1,6,3.]],threshold:3.6715380847454071e-003,right_val:0.2977376878261566,left_val:0.5204250216484070},{features:[[14,14,6,5,-1.],[14,14,3,5,2.]],threshold:-0.0353364497423172,right_val:0.4861505031585693,left_val:0.7238878011703491},{features:[[9,8,2,2,-1.],[9,9,2,1,2.]],threshold:-6.9189240457490087e-004,right_val:0.5229824781417847,left_val:0.3105022013187408},{features:[[10,7,1,3,-1.],[10,8,1,1,3.]],threshold:-3.3946109469980001e-003,right_val:0.5210173726081848,left_val:0.3138968050479889},{features:[[6,6,2,2,-1.],[6,6,1,1,2.],[7,7,1,1,2.]],threshold:9.8569283727556467e-004,right_val:0.6585097908973694,left_val:0.4536580145359039},{features:[[2,11,18,4,-1.],[11,11,9,2,2.],[2,13,9,2,2.]],threshold:-0.0501631014049053,right_val:0.5198916792869568,left_val:0.1804454028606415},{features:[[6,6,2,2,-1.],[6,6,1,1,2.],[7,7,1,1,2.]],threshold:-2.2367259953171015e-003,right_val:0.4651359021663666,left_val:0.7255702018737793},{features:[[0,15,20,2,-1.],[0,16,20,1,2.]],threshold:7.4326287722215056e-004,right_val:0.5898545980453491,left_val:0.4412921071052551},{features:[[4,14,2,3,-1.],[4,15,2,1,3.]],threshold:-9.3485182151198387e-004,right_val:0.5366017818450928,left_val:0.3500052988529205},{features:[[8,14,4,3,-1.],[8,15,4,1,3.]],threshold:0.0174979399889708,right_val:0.8315284848213196,left_val:0.4912194907665253},{features:[[8,7,2,3,-1.],[8,8,2,1,3.]],threshold:-1.5200000489130616e-003,right_val:0.5370560288429260,left_val:0.3570275902748108},{features:[[9,10,2,3,-1.],[9,11,2,1,3.]],threshold:7.8003940870985389e-004,right_val:0.5967335104942322,left_val:0.4353772103786469}],threshold:39.1072883605957030},{simpleClassifiers:[{features:[[5,4,10,4,-1.],[5,6,10,2,2.]],threshold:-9.9945552647113800e-003,right_val:0.3054533004760742,left_val:0.6162583231925964},{features:[[9,7,6,4,-1.],[12,7,3,2,2.],[9,9,3,2,2.]],threshold:-1.1085229925811291e-003,right_val:0.3155578076839447,left_val:0.5818294882774353},{features:[[4,7,3,6,-1.],[4,9,3,2,3.]],threshold:1.0364380432292819e-003,right_val:0.5692911744117737,left_val:0.2552052140235901},{features:[[11,15,4,4,-1.],[13,15,2,2,2.],[11,17,2,2,2.]],threshold:6.8211311008781195e-004,right_val:0.5934931039810181,left_val:0.3685089945793152},{features:[[7,8,4,2,-1.],[7,9,4,1,2.]],threshold:-6.8057340104132891e-004,right_val:0.5474792122840881,left_val:0.2332392036914825},{features:[[13,1,4,3,-1.],[13,1,2,3,2.]],threshold:2.6068789884448051e-004,right_val:0.5667545795440674,left_val:0.3257457017898560},{features:[[5,15,4,4,-1.],[5,15,2,2,2.],[7,17,2,2,2.]],threshold:5.1607372006401420e-004,right_val:0.5845472812652588,left_val:0.3744716942310333},{features:[[9,5,4,7,-1.],[9,5,2,7,2.]],threshold:8.5007521556690335e-004,right_val:0.5522807240486145,left_val:0.3420371115207672},{features:[[5,6,8,3,-1.],[9,6,4,3,2.]],threshold:-1.8607829697430134e-003,right_val:0.5375424027442932,left_val:0.2804419994354248},{features:[[9,9,2,2,-1.],[9,10,2,1,2.]],threshold:-1.5033970121294260e-003,right_val:0.5498952269554138,left_val:0.2579050958156586},{features:[[7,15,5,3,-1.],[7,16,5,1,3.]],threshold:2.3478909861296415e-003,right_val:0.6313710808753967,left_val:0.4175156056880951},{features:[[11,10,4,3,-1.],[11,10,2,3,2.]],threshold:-2.8880240279249847e-004,right_val:0.4052666127681732,left_val:0.5865169763565064},{features:[[6,9,8,10,-1.],[6,14,8,5,2.]],threshold:8.9405477046966553e-003,right_val:0.2318654060363770,left_val:0.5211141109466553},{features:[[10,11,6,2,-1.],[10,11,3,2,2.]],threshold:-0.0193277392536402,right_val:0.5241525769233704,left_val:0.2753432989120483},{features:[[4,11,6,2,-1.],[7,11,3,2,2.]],threshold:-2.0202060113660991e-004,right_val:0.3677195906639099,left_val:0.5722978711128235},{features:[[11,3,8,1,-1.],[11,3,4,1,2.]],threshold:2.1179069299250841e-003,right_val:0.5542430877685547,left_val:0.4466108083724976},{features:[[6,3,3,2,-1.],[7,3,1,2,3.]],threshold:-1.7743760254234076e-003,right_val:0.5300959944725037,left_val:0.2813253104686737},{features:[[14,5,6,5,-1.],[14,5,3,5,2.]],threshold:4.2234458960592747e-003,right_val:0.5795428156852722,left_val:0.4399709999561310},{features:[[7,5,2,12,-1.],[7,11,2,6,2.]],threshold:-0.0143752200528979,right_val:0.5292059183120728,left_val:0.2981117963790894},{features:[[8,11,4,3,-1.],[8,12,4,1,3.]],threshold:-0.0153491804376245,right_val:0.4748171865940094,left_val:0.7705215215682983},{features:[[4,1,2,3,-1.],[5,1,1,3,2.]],threshold:1.5152279956964776e-005,right_val:0.5576897263526917,left_val:0.3718844056129456},{features:[[18,3,2,6,-1.],[18,5,2,2,3.]],threshold:-9.1293919831514359e-003,right_val:0.5286766886711121,left_val:0.3615196049213409},{features:[[0,3,2,6,-1.],[0,5,2,2,3.]],threshold:2.2512159775942564e-003,right_val:0.3486298024654388,left_val:0.5364704728126526},{features:[[9,12,2,3,-1.],[9,13,2,1,3.]],threshold:-4.9696918576955795e-003,right_val:0.4676836133003235,left_val:0.6927651762962341},{features:[[7,13,4,3,-1.],[7,14,4,1,3.]],threshold:-0.0128290103748441,right_val:0.4660735130310059,left_val:0.7712153792381287},{features:[[18,0,2,6,-1.],[18,2,2,2,3.]],threshold:-9.3660065904259682e-003,right_val:0.5351287722587585,left_val:0.3374983966350555},{features:[[0,0,2,6,-1.],[0,2,2,2,3.]],threshold:3.2452319283038378e-003,right_val:0.3289610147476196,left_val:0.5325189828872681},{features:[[8,14,6,3,-1.],[8,15,6,1,3.]],threshold:-0.0117235602810979,right_val:0.4754300117492676,left_val:0.6837652921676636},{features:[[7,4,2,4,-1.],[8,4,1,4,2.]],threshold:2.9257940695970319e-005,right_val:0.5360502004623413,left_val:0.3572087883949280},{features:[[8,5,4,6,-1.],[8,7,4,2,3.]],threshold:-2.2244219508138485e-005,right_val:0.3552064001560211,left_val:0.5541427135467529},{features:[[6,4,2,2,-1.],[7,4,1,2,2.]],threshold:5.0881509669125080e-003,right_val:0.1256462037563324,left_val:0.5070844292640686},{features:[[3,14,14,4,-1.],[10,14,7,2,2.],[3,16,7,2,2.]],threshold:0.0274296794086695,right_val:0.1625818014144898,left_val:0.5269560217857361},{features:[[6,15,6,2,-1.],[6,15,3,1,2.],[9,16,3,1,2.]],threshold:-6.4142867922782898e-003,right_val:0.4584197103977203,left_val:0.7145588994026184},{features:[[14,15,6,2,-1.],[14,16,6,1,2.]],threshold:3.3479959238320589e-003,right_val:0.3494696915149689,left_val:0.5398612022399902},{features:[[2,12,12,8,-1.],[2,16,12,4,2.]],threshold:-0.0826354920864105,right_val:0.5160226225852966,left_val:0.2439192980527878},{features:[[7,7,7,2,-1.],[7,8,7,1,2.]],threshold:1.0261740535497665e-003,right_val:0.5767908096313477,left_val:0.3886891901493073},{features:[[0,2,18,2,-1.],[0,3,18,1,2.]],threshold:-1.6307090409100056e-003,right_val:0.5347700715065002,left_val:0.3389458060264587},{features:[[9,6,2,5,-1.],[9,6,1,5,2.]],threshold:2.4546680506318808e-003,right_val:0.6387246847152710,left_val:0.4601413905620575},{features:[[7,5,3,8,-1.],[8,5,1,8,3.]],threshold:-9.9476519972085953e-004,right_val:0.4120396077632904,left_val:0.5769879221916199},{features:[[9,6,3,4,-1.],[10,6,1,4,3.]],threshold:0.0154091902077198,right_val:0.7089822292327881,left_val:0.4878709018230438},{features:[[4,13,3,2,-1.],[4,14,3,1,2.]],threshold:1.1784400558099151e-003,right_val:0.2895244956016541,left_val:0.5263553261756897},{features:[[9,4,6,3,-1.],[11,4,2,3,3.]],threshold:-0.0277019198983908,right_val:0.5219606757164002,left_val:0.1498828977346420},{features:[[5,4,6,3,-1.],[7,4,2,3,3.]],threshold:-0.0295053999871016,right_val:0.4999816119670868,left_val:0.0248933192342520},{features:[[14,11,5,2,-1.],[14,12,5,1,2.]],threshold:4.5159430010244250e-004,right_val:0.4029662907123566,left_val:0.5464622974395752},{features:[[1,2,6,9,-1.],[3,2,2,9,3.]],threshold:7.1772639639675617e-003,right_val:0.5866296887397766,left_val:0.4271056950092316},{features:[[14,6,6,13,-1.],[14,6,3,13,2.]],threshold:-0.0741820484399796,right_val:0.4919027984142304,left_val:0.6874179244041443},{features:[[3,6,14,8,-1.],[3,6,7,4,2.],[10,10,7,4,2.]],threshold:-0.0172541607171297,right_val:0.5348739027976990,left_val:0.3370676040649414},{features:[[16,0,4,11,-1.],[16,0,2,11,2.]],threshold:0.0148515598848462,right_val:0.6129904985427856,left_val:0.4626792967319489},{features:[[3,4,12,12,-1.],[3,4,6,6,2.],[9,10,6,6,2.]],threshold:0.0100020002573729,right_val:0.3423453867435455,left_val:0.5346122980117798},{features:[[11,4,5,3,-1.],[11,5,5,1,3.]],threshold:2.0138120744377375e-003,right_val:0.5824304223060608,left_val:0.4643830060958862},{features:[[4,11,4,2,-1.],[4,12,4,1,2.]],threshold:1.5135470312088728e-003,right_val:0.2856149971485138,left_val:0.5196396112442017},{features:[[10,7,2,2,-1.],[10,7,1,2,2.]],threshold:3.1381431035697460e-003,right_val:0.5958529710769653,left_val:0.4838162958621979},{features:[[8,7,2,2,-1.],[9,7,1,2,2.]],threshold:-5.1450440660119057e-003,right_val:0.4741412103176117,left_val:0.8920302987098694},{features:[[9,17,3,2,-1.],[10,17,1,2,3.]],threshold:-4.4736708514392376e-003,right_val:0.5337278842926025,left_val:0.2033942937850952},{features:[[5,6,3,3,-1.],[5,7,3,1,3.]],threshold:1.9628470763564110e-003,right_val:0.6725863218307495,left_val:0.4571633934974670},{features:[[10,0,3,3,-1.],[11,0,1,3,3.]],threshold:5.4260450415313244e-003,right_val:0.2845670878887177,left_val:0.5271108150482178},{features:[[5,6,6,2,-1.],[5,6,3,1,2.],[8,7,3,1,2.]],threshold:4.9611460417509079e-004,right_val:0.5718597769737244,left_val:0.4138312935829163},{features:[[12,16,4,3,-1.],[12,17,4,1,3.]],threshold:9.3728788197040558e-003,right_val:0.2804847061634064,left_val:0.5225151181221008},{features:[[3,12,3,2,-1.],[3,13,3,1,2.]],threshold:6.0500897234305739e-004,right_val:0.3314523994922638,left_val:0.5236768722534180},{features:[[9,12,3,2,-1.],[9,13,3,1,2.]],threshold:5.6792551185935736e-004,right_val:0.6276971101760864,left_val:0.4531059861183167},{features:[[1,11,16,4,-1.],[1,11,8,2,2.],[9,13,8,2,2.]],threshold:0.0246443394571543,right_val:0.2017143964767456,left_val:0.5130851864814758},{features:[[12,4,3,3,-1.],[12,5,3,1,3.]],threshold:-0.0102904504165053,right_val:0.4876641035079956,left_val:0.7786595225334168},{features:[[4,4,5,3,-1.],[4,5,5,1,3.]],threshold:2.0629419013857841e-003,right_val:0.5881264209747315,left_val:0.4288598895072937},{features:[[12,16,4,3,-1.],[12,17,4,1,3.]],threshold:-5.0519481301307678e-003,right_val:0.5286008715629578,left_val:0.3523977994918823},{features:[[5,4,3,3,-1.],[5,5,3,1,3.]],threshold:-5.7692620903253555e-003,right_val:0.4588094055652618,left_val:0.6841086149215698},{features:[[9,0,2,2,-1.],[9,1,2,1,2.]],threshold:-4.5789941214025021e-004,right_val:0.5485978126525879,left_val:0.3565520048141480},{features:[[8,9,4,2,-1.],[8,10,4,1,2.]],threshold:-7.5918837683275342e-004,right_val:0.5254197120666504,left_val:0.3368793129920960},{features:[[8,8,4,3,-1.],[8,9,4,1,3.]],threshold:-1.7737259622663260e-003,right_val:0.5454015135765076,left_val:0.3422161042690277},{features:[[0,13,6,3,-1.],[2,13,2,3,3.]],threshold:-8.5610467940568924e-003,right_val:0.4485856890678406,left_val:0.6533612012863159},{features:[[16,14,3,2,-1.],[16,15,3,1,2.]],threshold:1.7277270089834929e-003,right_val:0.3925352990627289,left_val:0.5307580232620239},{features:[[1,18,18,2,-1.],[7,18,6,2,3.]],threshold:-0.0281996093690395,right_val:0.4588584005832672,left_val:0.6857458949089050},{features:[[16,14,3,2,-1.],[16,15,3,1,2.]],threshold:-1.7781109781935811e-003,right_val:0.5369856953620911,left_val:0.4037851095199585},{features:[[1,14,3,2,-1.],[1,15,3,1,2.]],threshold:3.3177141449414194e-004,right_val:0.3705750107765198,left_val:0.5399798750877380},{features:[[7,14,6,3,-1.],[7,15,6,1,3.]],threshold:2.6385399978607893e-003,right_val:0.6452730894088745,left_val:0.4665437042713165},{features:[[5,14,8,3,-1.],[5,15,8,1,3.]],threshold:-2.1183069329708815e-003,right_val:0.4064677059650421,left_val:0.5914781093597412},{features:[[10,6,4,14,-1.],[10,6,2,14,2.]],threshold:-0.0147732896730304,right_val:0.5294762849807739,left_val:0.3642038106918335},{features:[[6,6,4,14,-1.],[8,6,2,14,2.]],threshold:-0.0168154407292604,right_val:0.5144972801208496,left_val:0.2664231956005096},{features:[[13,5,2,3,-1.],[13,6,2,1,3.]],threshold:-6.3370140269398689e-003,right_val:0.4852097928524017,left_val:0.6779531240463257},{features:[[7,16,6,1,-1.],[9,16,2,1,3.]],threshold:-4.4560048991115764e-005,right_val:0.4153054058551788,left_val:0.5613964796066284},{features:[[9,12,3,3,-1.],[9,13,3,1,3.]],threshold:-1.0240620467811823e-003,right_val:0.4566304087638855,left_val:0.5964478254318237},{features:[[7,0,3,3,-1.],[8,0,1,3,3.]],threshold:-2.3161689750850201e-003,right_val:0.5188159942626953,left_val:0.2976115047931671},{features:[[4,0,16,18,-1.],[4,9,16,9,2.]],threshold:0.5321757197380066,right_val:0.2202631980180740,left_val:0.5187839269638062},{features:[[1,1,16,14,-1.],[1,8,16,7,2.]],threshold:-0.1664305031299591,right_val:0.5060343146324158,left_val:0.1866022944450378},{features:[[3,9,15,4,-1.],[8,9,5,4,3.]],threshold:0.1125352978706360,right_val:0.1185022965073586,left_val:0.5212125182151794},{features:[[6,12,7,3,-1.],[6,13,7,1,3.]],threshold:9.3046864494681358e-003,right_val:0.6826149225234985,left_val:0.4589937031269074},{features:[[14,15,2,3,-1.],[14,16,2,1,3.]],threshold:-4.6255099587142467e-003,right_val:0.5225008726119995,left_val:0.3079940974712372},{features:[[2,3,16,14,-1.],[2,3,8,7,2.],[10,10,8,7,2.]],threshold:-0.1111646965146065,right_val:0.5080801844596863,left_val:0.2101044058799744},{features:[[16,2,4,18,-1.],[18,2,2,9,2.],[16,11,2,9,2.]],threshold:-0.0108884396031499,right_val:0.4790464043617249,left_val:0.5765355229377747},{features:[[4,15,2,3,-1.],[4,16,2,1,3.]],threshold:5.8564301580190659e-003,right_val:0.1563598960638046,left_val:0.5065100193023682},{features:[[16,2,4,18,-1.],[18,2,2,9,2.],[16,11,2,9,2.]],threshold:0.0548543892800808,right_val:0.7230510711669922,left_val:0.4966914951801300},{features:[[1,1,8,3,-1.],[1,2,8,1,3.]],threshold:-0.0111973397433758,right_val:0.5098798274993897,left_val:0.2194979041814804},{features:[[8,11,4,3,-1.],[8,12,4,1,3.]],threshold:4.4069071300327778e-003,right_val:0.6770902872085571,left_val:0.4778401851654053},{features:[[5,11,5,9,-1.],[5,14,5,3,3.]],threshold:-0.0636652931571007,right_val:0.5081024169921875,left_val:0.1936362981796265},{features:[[16,0,4,11,-1.],[16,0,2,11,2.]],threshold:-9.8081491887569427e-003,right_val:0.4810341000556946,left_val:0.5999063253402710},{features:[[7,0,6,1,-1.],[9,0,2,1,3.]],threshold:-2.1717099007219076e-003,right_val:0.5235472917556763,left_val:0.3338333964347839},{features:[[16,3,3,7,-1.],[17,3,1,7,3.]],threshold:-0.0133155202493072,right_val:0.4919213056564331,left_val:0.6617069840431213},{features:[[1,3,3,7,-1.],[2,3,1,7,3.]],threshold:2.5442079640924931e-003,right_val:0.6082184910774231,left_val:0.4488744139671326},{features:[[7,8,6,12,-1.],[7,12,6,4,3.]],threshold:0.0120378397405148,right_val:0.3292432129383087,left_val:0.5409392118453980},{features:[[0,0,4,11,-1.],[2,0,2,11,2.]],threshold:-0.0207010507583618,right_val:0.4594995975494385,left_val:0.6819120049476624},{features:[[14,0,6,20,-1.],[14,0,3,20,2.]],threshold:0.0276082791388035,right_val:0.5767282843589783,left_val:0.4630792140960693},{features:[[0,3,1,2,-1.],[0,4,1,1,2.]],threshold:1.2370620388537645e-003,right_val:0.2635016143321991,left_val:0.5165379047393799},{features:[[5,5,10,8,-1.],[10,5,5,4,2.],[5,9,5,4,2.]],threshold:-0.0376693382859230,right_val:0.5278980135917664,left_val:0.2536393105983734},{features:[[4,7,12,4,-1.],[4,7,6,2,2.],[10,9,6,2,2.]],threshold:-1.8057259730994701e-003,right_val:0.5517500042915344,left_val:0.3985156118869782}],threshold:50.6104812622070310},{simpleClassifiers:[{features:[[2,1,6,4,-1.],[5,1,3,4,2.]],threshold:4.4299028813838959e-003,right_val:0.6335226297378540,left_val:0.2891018092632294},{features:[[9,7,6,4,-1.],[12,7,3,2,2.],[9,9,3,2,2.]],threshold:-2.3813319858163595e-003,right_val:0.3477487862110138,left_val:0.6211789250373840},{features:[[5,6,2,6,-1.],[5,9,2,3,2.]],threshold:2.2915711160749197e-003,right_val:0.5582118034362793,left_val:0.2254412025213242},{features:[[9,16,6,4,-1.],[12,16,3,2,2.],[9,18,3,2,2.]],threshold:9.9457940086722374e-004,right_val:0.5930070877075195,left_val:0.3711710870265961},{features:[[9,4,2,12,-1.],[9,10,2,6,2.]],threshold:7.7164667891338468e-004,right_val:0.3347995877265930,left_val:0.5651720166206360},{features:[[7,1,6,18,-1.],[9,1,2,18,3.]],threshold:-1.1386410333216190e-003,right_val:0.5508630871772766,left_val:0.3069126009941101},{features:[[4,12,12,2,-1.],[8,12,4,2,3.]],threshold:-1.6403039626311511e-004,right_val:0.3699047863483429,left_val:0.5762827992439270},{features:[[8,8,6,2,-1.],[8,9,6,1,2.]],threshold:2.9793529392918572e-005,right_val:0.5437911152839661,left_val:0.2644244134426117},{features:[[8,0,3,6,-1.],[9,0,1,6,3.]],threshold:8.5774902254343033e-003,right_val:0.1795724928379059,left_val:0.5051138997077942},{features:[[11,18,3,2,-1.],[11,19,3,1,2.]],threshold:-2.6032689493149519e-004,right_val:0.4446826875209808,left_val:0.5826969146728516},{features:[[1,1,17,4,-1.],[1,3,17,2,2.]],threshold:-6.1404630541801453e-003,right_val:0.5346971750259399,left_val:0.3113852143287659},{features:[[11,8,4,12,-1.],[11,8,2,12,2.]],threshold:-0.0230869501829147,right_val:0.5331197977066040,left_val:0.3277946114540100},{features:[[8,14,4,3,-1.],[8,15,4,1,3.]],threshold:-0.0142436502501369,right_val:0.4588063061237335,left_val:0.7381709814071655},{features:[[12,3,2,17,-1.],[12,3,1,17,2.]],threshold:0.0194871295243502,right_val:0.2274471968412399,left_val:0.5256630778312683},{features:[[4,7,6,1,-1.],[6,7,2,1,3.]],threshold:-9.6681108698248863e-004,right_val:0.3815006911754608,left_val:0.5511230826377869},{features:[[18,3,2,3,-1.],[18,4,2,1,3.]],threshold:3.1474709976464510e-003,right_val:0.2543726861476898,left_val:0.5425636768341065},{features:[[8,4,3,4,-1.],[8,6,3,2,2.]],threshold:-1.8026070029009134e-004,right_val:0.3406304121017456,left_val:0.5380191802978516},{features:[[4,5,12,10,-1.],[4,10,12,5,2.]],threshold:-6.0266260989010334e-003,right_val:0.5420572161674500,left_val:0.3035801947116852},{features:[[5,18,4,2,-1.],[7,18,2,2,2.]],threshold:4.4462960795499384e-004,right_val:0.5660110116004944,left_val:0.3990997076034546},{features:[[17,2,3,6,-1.],[17,4,3,2,3.]],threshold:2.2609760053455830e-003,right_val:0.3940688073635101,left_val:0.5562806725502014},{features:[[7,7,6,6,-1.],[9,7,2,6,3.]],threshold:0.0511330589652061,right_val:0.7118561863899231,left_val:0.4609653949737549},{features:[[17,2,3,6,-1.],[17,4,3,2,3.]],threshold:-0.0177863091230392,right_val:0.5322144031524658,left_val:0.2316166013479233},{features:[[8,0,3,4,-1.],[9,0,1,4,3.]],threshold:-4.9679628573358059e-003,right_val:0.5122029185295105,left_val:0.2330771982669830},{features:[[9,14,2,3,-1.],[9,15,2,1,3.]],threshold:2.0667689386755228e-003,right_val:0.6455488204956055,left_val:0.4657444059848785},{features:[[0,12,6,3,-1.],[0,13,6,1,3.]],threshold:7.4413768015801907e-003,right_val:0.2361633926630020,left_val:0.5154392123222351},{features:[[8,14,4,3,-1.],[8,15,4,1,3.]],threshold:-3.6277279723435640e-003,right_val:0.4476661086082459,left_val:0.6219773292541504},{features:[[3,12,2,3,-1.],[3,13,2,1,3.]],threshold:-5.3530759178102016e-003,right_val:0.5102208256721497,left_val:0.1837355047464371},{features:[[5,6,12,7,-1.],[9,6,4,7,3.]],threshold:0.1453091949224472,right_val:0.1535930931568146,left_val:0.5145987272262573},{features:[[0,2,3,6,-1.],[0,4,3,2,3.]],threshold:2.4394490756094456e-003,right_val:0.3624661862850189,left_val:0.5343660116195679},{features:[[14,6,1,3,-1.],[14,7,1,1,3.]],threshold:-3.1283390708267689e-003,right_val:0.4845592081546783,left_val:0.6215007901191711},{features:[[2,0,3,14,-1.],[3,0,1,14,3.]],threshold:1.7940260004252195e-003,right_val:0.5824198126792908,left_val:0.4299261868000031},{features:[[12,14,5,6,-1.],[12,16,5,2,3.]],threshold:0.0362538211047649,right_val:0.1439467966556549,left_val:0.5260334014892578},{features:[[4,14,5,6,-1.],[4,16,5,2,3.]],threshold:-5.1746722310781479e-003,right_val:0.5287045240402222,left_val:0.3506538867950440},{features:[[11,10,2,2,-1.],[12,10,1,1,2.],[11,11,1,1,2.]],threshold:6.5383297624066472e-004,right_val:0.6122040152549744,left_val:0.4809640944004059},{features:[[5,0,3,14,-1.],[6,0,1,14,3.]],threshold:-0.0264802295714617,right_val:0.5045586228370667,left_val:0.1139362007379532},{features:[[10,15,2,3,-1.],[10,16,2,1,3.]],threshold:-3.0440660193562508e-003,right_val:0.4794734120368958,left_val:0.6352095007896423},{features:[[0,2,2,3,-1.],[0,3,2,1,3.]],threshold:3.6993520334362984e-003,right_val:0.2498510926961899,left_val:0.5131118297576904},{features:[[5,11,12,6,-1.],[5,14,12,3,2.]],threshold:-3.6762931267730892e-004,right_val:0.3709532022476196,left_val:0.5421394705772400},{features:[[6,11,3,9,-1.],[6,14,3,3,3.]],threshold:-0.0413822606205940,right_val:0.5081691741943359,left_val:0.1894959956407547},{features:[[11,10,2,2,-1.],[12,10,1,1,2.],[11,11,1,1,2.]],threshold:-1.0532729793339968e-003,right_val:0.4783608913421631,left_val:0.6454367041587830},{features:[[5,6,1,3,-1.],[5,7,1,1,3.]],threshold:-2.1648600231856108e-003,right_val:0.4499826133251190,left_val:0.6215031147003174},{features:[[4,9,13,3,-1.],[4,10,13,1,3.]],threshold:-5.6747748749330640e-004,right_val:0.5419334769248962,left_val:0.3712610900402069},{features:[[1,7,15,6,-1.],[6,7,5,6,3.]],threshold:0.1737584024667740,right_val:0.1215742006897926,left_val:0.5023643970489502},{features:[[4,5,12,6,-1.],[8,5,4,6,3.]],threshold:-2.9049699660390615e-003,right_val:0.5381883978843689,left_val:0.3240267932415009},{features:[[8,10,4,3,-1.],[8,11,4,1,3.]],threshold:1.2299539521336555e-003,right_val:0.5703486204147339,left_val:0.4165507853031158},{features:[[15,14,1,3,-1.],[15,15,1,1,3.]],threshold:-5.4329237900674343e-004,right_val:0.5547549128532410,left_val:0.3854042887687683},{features:[[1,11,5,3,-1.],[1,12,5,1,3.]],threshold:-8.3297258242964745e-003,right_val:0.5097082853317261,left_val:0.2204494029283524},{features:[[7,1,7,12,-1.],[7,7,7,6,2.]],threshold:-1.0417630255687982e-004,right_val:0.4303036034107208,left_val:0.5607066154479981},{features:[[0,1,6,10,-1.],[0,1,3,5,2.],[3,6,3,5,2.]],threshold:0.0312047004699707,right_val:0.6982004046440125,left_val:0.4621657133102417},{features:[[16,1,4,3,-1.],[16,2,4,1,3.]],threshold:7.8943502157926559e-003,right_val:0.2269068062305450,left_val:0.5269594192504883},{features:[[5,5,2,3,-1.],[5,6,2,1,3.]],threshold:-4.3645310215651989e-003,right_val:0.4537956118583679,left_val:0.6359223127365112},{features:[[12,2,3,5,-1.],[13,2,1,5,3.]],threshold:7.6793059706687927e-003,right_val:0.2740483880043030,left_val:0.5274767875671387},{features:[[0,3,4,6,-1.],[0,5,4,2,3.]],threshold:-0.0254311393946409,right_val:0.5071732997894287,left_val:0.2038519978523254},{features:[[8,12,4,2,-1.],[8,13,4,1,2.]],threshold:8.2000601105391979e-004,right_val:0.6119868159294128,left_val:0.4587455093860626},{features:[[8,18,3,1,-1.],[9,18,1,1,3.]],threshold:2.9284600168466568e-003,right_val:0.2028204947710037,left_val:0.5071274042129517},{features:[[11,10,2,2,-1.],[12,10,1,1,2.],[11,11,1,1,2.]],threshold:4.5256470912136137e-005,right_val:0.5430821776390076,left_val:0.4812104105949402},{features:[[7,10,2,2,-1.],[7,10,1,1,2.],[8,11,1,1,2.]],threshold:1.3158309739083052e-003,right_val:0.6779323220252991,left_val:0.4625813961029053},{features:[[11,11,4,4,-1.],[11,13,4,2,2.]],threshold:1.5870389761403203e-003,right_val:0.3431465029716492,left_val:0.5386291742324829},{features:[[8,12,3,8,-1.],[9,12,1,8,3.]],threshold:-0.0215396601706743,right_val:0.5003222823143005,left_val:0.0259425006806850},{features:[[13,0,6,3,-1.],[13,1,6,1,3.]],threshold:0.0143344802781940,right_val:0.1590632945299149,left_val:0.5202844738960266},{features:[[8,8,3,4,-1.],[9,8,1,4,3.]],threshold:-8.3881383761763573e-003,right_val:0.4648044109344482,left_val:0.7282481193542481},{features:[[5,7,10,10,-1.],[10,7,5,5,2.],[5,12,5,5,2.]],threshold:9.1906841844320297e-003,right_val:0.3923191130161285,left_val:0.5562356710433960},{features:[[3,18,8,2,-1.],[3,18,4,1,2.],[7,19,4,1,2.]],threshold:-5.8453059755265713e-003,right_val:0.4629127979278565,left_val:0.6803392767906189},{features:[[10,2,6,8,-1.],[12,2,2,8,3.]],threshold:-0.0547077991068363,right_val:0.5206125974655151,left_val:0.2561671137809753},{features:[[4,2,6,8,-1.],[6,2,2,8,3.]],threshold:9.1142775490880013e-003,right_val:0.3053877055644989,left_val:0.5189620256423950},{features:[[11,0,3,7,-1.],[12,0,1,7,3.]],threshold:-0.0155750000849366,right_val:0.5169094800949097,left_val:0.1295074969530106},{features:[[7,11,2,1,-1.],[8,11,1,1,2.]],threshold:-1.2050600344082341e-004,right_val:0.4230825006961823,left_val:0.5735098123550415},{features:[[15,14,1,3,-1.],[15,15,1,1,3.]],threshold:1.2273970060050488e-003,right_val:0.4079791903495789,left_val:0.5289878249168396},{features:[[7,15,2,2,-1.],[7,15,1,1,2.],[8,16,1,1,2.]],threshold:-1.2186600361019373e-003,right_val:0.4574409127235413,left_val:0.6575639843940735},{features:[[15,14,1,3,-1.],[15,15,1,1,3.]],threshold:-3.3256649039685726e-003,right_val:0.5195019841194153,left_val:0.3628047108650208},{features:[[6,0,3,7,-1.],[7,0,1,7,3.]],threshold:-0.0132883097976446,right_val:0.5043488740921021,left_val:0.1284265965223312},{features:[[18,1,2,7,-1.],[18,1,1,7,2.]],threshold:-3.3839771058410406e-003,right_val:0.4757505953311920,left_val:0.6292240023612976},{features:[[2,0,8,20,-1.],[2,10,8,10,2.]],threshold:-0.2195422053337097,right_val:0.5065013766288757,left_val:0.1487731933593750},{features:[[3,0,15,6,-1.],[3,2,15,2,3.]],threshold:4.9111708067357540e-003,right_val:0.5665838718414307,left_val:0.4256102144718170},{features:[[4,3,12,2,-1.],[4,4,12,1,2.]],threshold:-1.8744950648397207e-004,right_val:0.5586857199668884,left_val:0.4004144072532654},{features:[[16,0,4,5,-1.],[16,0,2,5,2.]],threshold:-5.2178641781210899e-003,right_val:0.4812706112861633,left_val:0.6009116172790527},{features:[[7,0,3,4,-1.],[8,0,1,4,3.]],threshold:-1.1111519997939467e-003,right_val:0.5287089943885803,left_val:0.3514933884143829},{features:[[16,0,4,5,-1.],[16,0,2,5,2.]],threshold:4.4036400504410267e-003,right_val:0.5924085974693298,left_val:0.4642275869846344},{features:[[1,7,6,13,-1.],[3,7,2,13,3.]],threshold:0.1229949966073036,right_val:0.0691524818539619,left_val:0.5025529265403748},{features:[[16,0,4,5,-1.],[16,0,2,5,2.]],threshold:-0.0123135102912784,right_val:0.4934012889862061,left_val:0.5884591937065125},{features:[[0,0,4,5,-1.],[2,0,2,5,2.]],threshold:4.1471039876341820e-003,right_val:0.5893477797508240,left_val:0.4372239112854004},{features:[[14,12,3,6,-1.],[14,14,3,2,3.]],threshold:-3.5502649843692780e-003,right_val:0.5396270155906677,left_val:0.4327551126480103},{features:[[3,12,3,6,-1.],[3,14,3,2,3.]],threshold:-0.0192242693156004,right_val:0.5068330764770508,left_val:0.1913134008646011},{features:[[16,1,4,3,-1.],[16,2,4,1,3.]],threshold:1.4395059552043676e-003,right_val:0.4243533015251160,left_val:0.5308178067207336},{features:[[8,7,2,10,-1.],[8,7,1,5,2.],[9,12,1,5,2.]],threshold:-6.7751999013125896e-003,right_val:0.4540086090564728,left_val:0.6365395784378052},{features:[[11,11,4,4,-1.],[11,13,4,2,2.]],threshold:7.0119630545377731e-003,right_val:0.3026199936866760,left_val:0.5189834237098694},{features:[[0,1,4,3,-1.],[0,2,4,1,3.]],threshold:5.4014651104807854e-003,right_val:0.2557682991027832,left_val:0.5105062127113342},{features:[[13,4,1,3,-1.],[13,5,1,1,3.]],threshold:9.0274988906458020e-004,right_val:0.5861827731132507,left_val:0.4696914851665497},{features:[[7,15,3,5,-1.],[8,15,1,5,3.]],threshold:0.0114744501188397,right_val:0.1527177989482880,left_val:0.5053645968437195},{features:[[9,7,3,5,-1.],[10,7,1,5,3.]],threshold:-6.7023430019617081e-003,right_val:0.4890604019165039,left_val:0.6508980989456177},{features:[[8,7,3,5,-1.],[9,7,1,5,3.]],threshold:-2.0462959073483944e-003,right_val:0.4514600038528442,left_val:0.6241816878318787},{features:[[10,6,4,14,-1.],[10,6,2,14,2.]],threshold:-9.9951568990945816e-003,right_val:0.5400953888893127,left_val:0.3432781100273132},{features:[[0,5,5,6,-1.],[0,7,5,2,3.]],threshold:-0.0357007086277008,right_val:0.5074077844619751,left_val:0.1878059059381485},{features:[[9,5,6,4,-1.],[9,5,3,4,2.]],threshold:4.5584561303257942e-004,right_val:0.5402569770812988,left_val:0.3805277049541473},{features:[[0,0,18,10,-1.],[6,0,6,10,3.]],threshold:-0.0542606003582478,right_val:0.4595097005367279,left_val:0.6843714714050293},{features:[[10,6,4,14,-1.],[10,6,2,14,2.]],threshold:6.0600461438298225e-003,right_val:0.4500527977943420,left_val:0.5502905249595642},{features:[[6,6,4,14,-1.],[8,6,2,14,2.]],threshold:-6.4791832119226456e-003,right_val:0.5310757160186768,left_val:0.3368858098983765},{features:[[13,4,1,3,-1.],[13,5,1,1,3.]],threshold:-1.4939469983801246e-003,right_val:0.4756175875663757,left_val:0.6487640142440796},{features:[[5,1,2,3,-1.],[6,1,1,3,2.]],threshold:1.4610530342906713e-005,right_val:0.5451064109802246,left_val:0.4034579098224640},{features:[[18,1,2,18,-1.],[19,1,1,9,2.],[18,10,1,9,2.]],threshold:-7.2321938350796700e-003,right_val:0.4824739992618561,left_val:0.6386873722076416},{features:[[2,1,4,3,-1.],[2,2,4,1,3.]],threshold:-4.0645818226039410e-003,right_val:0.5157335996627808,left_val:0.2986421883106232},{features:[[18,1,2,18,-1.],[19,1,1,9,2.],[18,10,1,9,2.]],threshold:0.0304630808532238,right_val:0.7159956097602844,left_val:0.5022199749946594},{features:[[1,14,4,6,-1.],[1,14,2,3,2.],[3,17,2,3,2.]],threshold:-8.0544911324977875e-003,right_val:0.4619275033473969,left_val:0.6492452025413513},{features:[[10,11,7,6,-1.],[10,13,7,2,3.]],threshold:0.0395051389932632,right_val:0.2450613975524902,left_val:0.5150570869445801},{features:[[0,10,6,10,-1.],[0,10,3,5,2.],[3,15,3,5,2.]],threshold:8.4530208259820938e-003,right_val:0.6394037008285523,left_val:0.4573669135570526},{features:[[11,0,3,4,-1.],[12,0,1,4,3.]],threshold:-1.1688120430335402e-003,right_val:0.5483661293983460,left_val:0.3865512013435364},{features:[[5,10,5,6,-1.],[5,13,5,3,2.]],threshold:2.8070670086890459e-003,right_val:0.2701480090618134,left_val:0.5128579139709473},{features:[[14,6,1,8,-1.],[14,10,1,4,2.]],threshold:4.7365209320560098e-004,right_val:0.5387461185455322,left_val:0.4051581919193268},{features:[[1,7,18,6,-1.],[1,7,9,3,2.],[10,10,9,3,2.]],threshold:0.0117410803213716,right_val:0.3719413876533508,left_val:0.5295950174331665},{features:[[9,7,2,2,-1.],[9,7,1,2,2.]],threshold:3.1833238899707794e-003,right_val:0.6895126104354858,left_val:0.4789406955242157},{features:[[5,9,4,5,-1.],[7,9,2,5,2.]],threshold:7.0241501089185476e-004,right_val:0.3918080925941467,left_val:0.5384489297866821}],threshold:54.6200714111328130},{simpleClassifiers:[{features:[[7,6,6,3,-1.],[9,6,2,3,3.]],threshold:0.0170599296689034,right_val:0.7142534852027893,left_val:0.3948527872562408},{features:[[1,0,18,4,-1.],[7,0,6,4,3.]],threshold:0.0218408405780792,right_val:0.6090016961097717,left_val:0.3370316028594971},{features:[[7,15,2,4,-1.],[7,17,2,2,2.]],threshold:2.4520049919374287e-004,right_val:0.5987902283668518,left_val:0.3500576019287109},{features:[[1,0,19,9,-1.],[1,3,19,3,3.]],threshold:8.3272606134414673e-003,right_val:0.5697240829467773,left_val:0.3267528116703033},{features:[[3,7,3,6,-1.],[3,9,3,2,3.]],threshold:5.7148298947140574e-004,right_val:0.5531656742095947,left_val:0.3044599890708923},{features:[[13,7,4,4,-1.],[15,7,2,2,2.],[13,9,2,2,2.]],threshold:6.7373987985774875e-004,right_val:0.5672631263732910,left_val:0.3650012016296387},{features:[[3,7,4,4,-1.],[3,7,2,2,2.],[5,9,2,2,2.]],threshold:3.4681590477703139e-005,right_val:0.5388727188110352,left_val:0.3313541114330292},{features:[[9,6,10,8,-1.],[9,10,10,4,2.]],threshold:-5.8563398197293282e-003,right_val:0.5498778820037842,left_val:0.2697942852973938},{features:[[3,8,14,12,-1.],[3,14,14,6,2.]],threshold:8.5102273151278496e-003,right_val:0.2762879133224487,left_val:0.5269358158111572},{features:[[6,5,10,12,-1.],[11,5,5,6,2.],[6,11,5,6,2.]],threshold:-0.0698172077536583,right_val:0.5259246826171875,left_val:0.2909603118896484},{features:[[9,11,2,3,-1.],[9,12,2,1,3.]],threshold:-8.6113670840859413e-004,right_val:0.4073697924613953,left_val:0.5892577171325684},{features:[[9,5,6,5,-1.],[9,5,3,5,2.]],threshold:9.7149249631911516e-004,right_val:0.5415862202644348,left_val:0.3523564040660858},{features:[[9,4,2,4,-1.],[9,6,2,2,2.]],threshold:-1.4727490452060010e-005,right_val:0.3503156006336212,left_val:0.5423017740249634},{features:[[9,5,6,5,-1.],[9,5,3,5,2.]],threshold:0.0484202913939953,right_val:0.3411195874214172,left_val:0.5193945765495300},{features:[[5,5,6,5,-1.],[8,5,3,5,2.]],threshold:1.3257140526548028e-003,right_val:0.5335376262664795,left_val:0.3157769143581390},{features:[[11,2,6,1,-1.],[13,2,2,1,3.]],threshold:1.4922149603080470e-005,right_val:0.5536553859710693,left_val:0.4451299905776978},{features:[[3,2,6,1,-1.],[5,2,2,1,3.]],threshold:-2.7173398993909359e-003,right_val:0.5248088836669922,left_val:0.3031741976737976},{features:[[13,5,2,3,-1.],[13,6,2,1,3.]],threshold:2.9219500720500946e-003,right_val:0.6606041789054871,left_val:0.4781453013420105},{features:[[0,10,1,4,-1.],[0,12,1,2,2.]],threshold:-1.9804988987743855e-003,right_val:0.5287625193595886,left_val:0.3186308145523071},{features:[[13,5,2,3,-1.],[13,6,2,1,3.]],threshold:-4.0012109093368053e-003,right_val:0.4749928116798401,left_val:0.6413596868515015},{features:[[8,18,3,2,-1.],[9,18,1,2,3.]],threshold:-4.3491991236805916e-003,right_val:0.5098996758460999,left_val:0.1507498025894165},{features:[[6,15,9,2,-1.],[6,16,9,1,2.]],threshold:1.3490889687091112e-003,right_val:0.5881167054176331,left_val:0.4316158890724182},{features:[[8,14,4,3,-1.],[8,15,4,1,3.]],threshold:0.0185970701277256,right_val:0.9089794158935547,left_val:0.4735553860664368},{features:[[18,4,2,4,-1.],[18,6,2,2,2.]],threshold:-1.8562379991635680e-003,right_val:0.5577837228775024,left_val:0.3553189039230347},{features:[[5,5,2,3,-1.],[5,6,2,1,3.]],threshold:2.2940430790185928e-003,right_val:0.6580877900123596,left_val:0.4500094950199127},{features:[[15,16,3,2,-1.],[15,17,3,1,2.]],threshold:2.9982850537635386e-004,right_val:0.3975878953933716,left_val:0.5629242062568665},{features:[[0,0,3,9,-1.],[0,3,3,3,3.]],threshold:3.5455459728837013e-003,right_val:0.3605485856533051,left_val:0.5381547212600708},{features:[[9,7,3,3,-1.],[9,8,3,1,3.]],threshold:9.6104722470045090e-003,right_val:0.1796745955944061,left_val:0.5255997180938721},{features:[[8,7,3,3,-1.],[8,8,3,1,3.]],threshold:-6.2783220782876015e-003,right_val:0.5114030241966248,left_val:0.2272856980562210},{features:[[9,5,2,6,-1.],[9,5,1,6,2.]],threshold:3.4598479978740215e-003,right_val:0.6608219146728516,left_val:0.4626308083534241},{features:[[8,6,3,4,-1.],[9,6,1,4,3.]],threshold:-1.3112019514665008e-003,right_val:0.4436857998371124,left_val:0.6317539811134338},{features:[[7,6,8,12,-1.],[11,6,4,6,2.],[7,12,4,6,2.]],threshold:2.6876179035753012e-003,right_val:0.4054022133350372,left_val:0.5421109795570374},{features:[[5,6,8,12,-1.],[5,6,4,6,2.],[9,12,4,6,2.]],threshold:3.9118169806897640e-003,right_val:0.3273454904556274,left_val:0.5358477830886841},{features:[[12,4,3,3,-1.],[12,5,3,1,3.]],threshold:-0.0142064504325390,right_val:0.4975781142711639,left_val:0.7793576717376709},{features:[[2,16,3,2,-1.],[2,17,3,1,2.]],threshold:7.1705528534948826e-004,right_val:0.3560903966426849,left_val:0.5297319889068604},{features:[[12,4,3,3,-1.],[12,5,3,1,3.]],threshold:1.6635019565001130e-003,right_val:0.5816481709480286,left_val:0.4678094089031220},{features:[[2,12,6,6,-1.],[2,14,6,2,3.]],threshold:3.3686188980937004e-003,right_val:0.3446420133113861,left_val:0.5276734232902527},{features:[[7,13,6,3,-1.],[7,14,6,1,3.]],threshold:0.0127995302900672,right_val:0.7472159266471863,left_val:0.4834679961204529},{features:[[6,14,6,3,-1.],[6,15,6,1,3.]],threshold:3.3901201095432043e-003,right_val:0.6401721239089966,left_val:0.4511859118938446},{features:[[14,15,5,3,-1.],[14,16,5,1,3.]],threshold:4.7070779837667942e-003,right_val:0.3555220961570740,left_val:0.5335658788681030},{features:[[5,4,3,3,-1.],[5,5,3,1,3.]],threshold:1.4819339849054813e-003,right_val:0.5772724151611328,left_val:0.4250707030296326},{features:[[14,15,5,3,-1.],[14,16,5,1,3.]],threshold:-6.9995759986341000e-003,right_val:0.5292900204658508,left_val:0.3003320097923279},{features:[[5,3,6,2,-1.],[7,3,2,2,3.]],threshold:0.0159390103071928,right_val:0.1675581932067871,left_val:0.5067319273948669},{features:[[8,15,4,3,-1.],[8,16,4,1,3.]],threshold:7.6377349905669689e-003,right_val:0.7085601091384888,left_val:0.4795069992542267},{features:[[1,15,5,3,-1.],[1,16,5,1,3.]],threshold:6.7334040068089962e-003,right_val:0.2162470072507858,left_val:0.5133113265037537},{features:[[8,13,4,6,-1.],[10,13,2,3,2.],[8,16,2,3,2.]],threshold:-0.0128588099032640,right_val:0.5251371860504150,left_val:0.1938841938972473},{features:[[7,8,3,3,-1.],[8,8,1,3,3.]],threshold:-6.2270800117403269e-004,right_val:0.4197868108749390,left_val:0.5686538219451904},{features:[[12,0,5,4,-1.],[12,2,5,2,2.]],threshold:-5.2651681471616030e-004,right_val:0.5429695844650269,left_val:0.4224168956279755},{features:[[0,2,20,2,-1.],[0,2,10,1,2.],[10,3,10,1,2.]],threshold:0.0110750999301672,right_val:0.2514517903327942,left_val:0.5113775134086609},{features:[[1,0,18,4,-1.],[7,0,6,4,3.]],threshold:-0.0367282517254353,right_val:0.4849618971347809,left_val:0.7194662094116211},{features:[[4,3,6,1,-1.],[6,3,2,1,3.]],threshold:-2.8207109426148236e-004,right_val:0.5394446253776550,left_val:0.3840261995792389},{features:[[4,18,13,2,-1.],[4,19,13,1,2.]],threshold:-2.7489690110087395e-003,right_val:0.4569182097911835,left_val:0.5937088727951050},{features:[[2,10,3,6,-1.],[2,12,3,2,3.]],threshold:0.0100475195795298,right_val:0.2802298069000244,left_val:0.5138576030731201},{features:[[14,12,6,8,-1.],[17,12,3,4,2.],[14,16,3,4,2.]],threshold:-8.1497840583324432e-003,right_val:0.4636121094226837,left_val:0.6090037226676941},{features:[[4,13,10,6,-1.],[4,13,5,3,2.],[9,16,5,3,2.]],threshold:-6.8833888508379459e-003,right_val:0.5254660248756409,left_val:0.3458611071109772},{features:[[14,12,1,2,-1.],[14,13,1,1,2.]],threshold:-1.4039360394235700e-005,right_val:0.4082083106040955,left_val:0.5693104267120361},{features:[[8,13,4,3,-1.],[8,14,4,1,3.]],threshold:1.5498419525101781e-003,right_val:0.5806517004966736,left_val:0.4350537061691284},{features:[[14,12,2,2,-1.],[14,13,2,1,2.]],threshold:-6.7841499112546444e-003,right_val:0.5182775259017944,left_val:0.1468873023986816},{features:[[4,12,2,2,-1.],[4,13,2,1,2.]],threshold:2.1705629478674382e-004,right_val:0.3456174135208130,left_val:0.5293524265289307},{features:[[8,12,9,2,-1.],[8,13,9,1,2.]],threshold:3.1198898795992136e-004,right_val:0.5942413806915283,left_val:0.4652450978755951},{features:[[9,14,2,3,-1.],[9,15,2,1,3.]],threshold:5.4507530294358730e-003,right_val:0.7024846076965332,left_val:0.4653508961200714},{features:[[11,10,3,6,-1.],[11,13,3,3,2.]],threshold:-2.5818689027801156e-004,right_val:0.3768967092037201,left_val:0.5497295260429382},{features:[[5,6,9,12,-1.],[5,12,9,6,2.]],threshold:-0.0174425393342972,right_val:0.5457497835159302,left_val:0.3919087946414948},{features:[[11,10,3,6,-1.],[11,13,3,3,2.]],threshold:-0.0453435294330120,right_val:0.5154908895492554,left_val:0.1631357073783875},{features:[[6,10,3,6,-1.],[6,13,3,3,2.]],threshold:1.9190689781680703e-003,right_val:0.2791895866394043,left_val:0.5145897865295410},{features:[[5,4,11,3,-1.],[5,5,11,1,3.]],threshold:-6.0177869163453579e-003,right_val:0.4756332933902741,left_val:0.6517636179924011},{features:[[7,1,5,10,-1.],[7,6,5,5,2.]],threshold:-4.0720738470554352e-003,right_val:0.4092685878276825,left_val:0.5514652729034424},{features:[[2,8,18,2,-1.],[2,9,18,1,2.]],threshold:3.9855059003457427e-004,right_val:0.5285550951957703,left_val:0.3165240883827210},{features:[[7,17,5,3,-1.],[7,18,5,1,3.]],threshold:-6.5418570302426815e-003,right_val:0.4652808904647827,left_val:0.6853377819061279},{features:[[5,9,12,1,-1.],[9,9,4,1,3.]],threshold:3.4845089539885521e-003,right_val:0.4502759873867035,left_val:0.5484588146209717},{features:[[0,14,6,6,-1.],[0,14,3,3,2.],[3,17,3,3,2.]],threshold:-0.0136967804282904,right_val:0.4572555124759674,left_val:0.6395779848098755},{features:[[5,9,12,1,-1.],[9,9,4,1,3.]],threshold:-0.0173471402376890,right_val:0.5181614756584168,left_val:0.2751072943210602},{features:[[3,9,12,1,-1.],[7,9,4,1,3.]],threshold:-4.0885428898036480e-003,right_val:0.5194984078407288,left_val:0.3325636088848114},{features:[[14,10,6,7,-1.],[14,10,3,7,2.]],threshold:-9.4687901437282562e-003,right_val:0.4851819872856140,left_val:0.5942280888557434},{features:[[1,0,16,2,-1.],[1,1,16,1,2.]],threshold:1.7084840219467878e-003,right_val:0.5519806146621704,left_val:0.4167110919952393},{features:[[10,9,10,9,-1.],[10,12,10,3,3.]],threshold:9.4809094443917274e-003,right_val:0.4208514988422394,left_val:0.5433894991874695},{features:[[0,1,10,2,-1.],[5,1,5,2,2.]],threshold:-4.7389650717377663e-003,right_val:0.4560655057430267,left_val:0.6407189965248108},{features:[[17,3,2,3,-1.],[17,4,2,1,3.]],threshold:6.5761050209403038e-003,right_val:0.2258227020502091,left_val:0.5214555263519287},{features:[[1,3,2,3,-1.],[1,4,2,1,3.]],threshold:-2.1690549328923225e-003,right_val:0.5156704783439636,left_val:0.3151527941226959},{features:[[9,7,3,6,-1.],[10,7,1,6,3.]],threshold:0.0146601703017950,right_val:0.6689941287040710,left_val:0.4870837032794952},{features:[[6,5,4,3,-1.],[8,5,2,3,2.]],threshold:1.7231999663636088e-004,right_val:0.5251078009605408,left_val:0.3569748997688294},{features:[[7,5,6,6,-1.],[9,5,2,6,3.]],threshold:-0.0218037609010935,right_val:0.4966329932212830,left_val:0.8825920820236206},{features:[[3,4,12,12,-1.],[3,4,6,6,2.],[9,10,6,6,2.]],threshold:-0.0947361066937447,right_val:0.5061113834381104,left_val:0.1446162015199661},{features:[[9,2,6,15,-1.],[11,2,2,15,3.]],threshold:5.5825551971793175e-003,right_val:0.4238066077232361,left_val:0.5396478772163391},{features:[[2,2,6,17,-1.],[4,2,2,17,3.]],threshold:1.9517090404406190e-003,right_val:0.5497786998748779,left_val:0.4170410931110382},{features:[[14,10,6,7,-1.],[14,10,3,7,2.]],threshold:0.0121499001979828,right_val:0.5664274096488953,left_val:0.4698367118835449},{features:[[0,10,6,7,-1.],[3,10,3,7,2.]],threshold:-7.5169620104134083e-003,right_val:0.4463135898113251,left_val:0.6267772912979126},{features:[[9,2,6,15,-1.],[11,2,2,15,3.]],threshold:-0.0716679096221924,right_val:0.5221003293991089,left_val:0.3097011148929596},{features:[[5,2,6,15,-1.],[7,2,2,15,3.]],threshold:-0.0882924199104309,right_val:0.5006365180015564,left_val:0.0811238884925842},{features:[[17,9,3,6,-1.],[17,11,3,2,3.]],threshold:0.0310630798339844,right_val:0.1282255947589874,left_val:0.5155503749847412},{features:[[6,7,6,6,-1.],[8,7,2,6,3.]],threshold:0.0466218404471874,right_val:0.7363960742950440,left_val:0.4699777960777283},{features:[[1,10,18,6,-1.],[10,10,9,3,2.],[1,13,9,3,2.]],threshold:-0.0121894897893071,right_val:0.5518996715545654,left_val:0.3920530080795288},{features:[[0,9,10,9,-1.],[0,12,10,3,3.]],threshold:0.0130161102861166,right_val:0.3685136139392853,left_val:0.5260658264160156},{features:[[8,15,4,3,-1.],[8,16,4,1,3.]],threshold:-3.4952899441123009e-003,right_val:0.4716280996799469,left_val:0.6339294910430908},{features:[[5,12,3,4,-1.],[5,14,3,2,2.]],threshold:-4.4015039748046547e-005,right_val:0.3776184916496277,left_val:0.5333027243614197},{features:[[3,3,16,12,-1.],[3,9,16,6,2.]],threshold:-0.1096649020910263,right_val:0.5198346972465515,left_val:0.1765342056751251},{features:[[1,1,12,12,-1.],[1,1,6,6,2.],[7,7,6,6,2.]],threshold:-9.0279558207839727e-004,right_val:0.3838908076286316,left_val:0.5324159860610962},{features:[[10,4,2,4,-1.],[11,4,1,2,2.],[10,6,1,2,2.]],threshold:7.1126641705632210e-004,right_val:0.5755224227905273,left_val:0.4647929966449738},{features:[[0,9,10,2,-1.],[0,9,5,1,2.],[5,10,5,1,2.]],threshold:-3.1250279862433672e-003,right_val:0.5166770815849304,left_val:0.3236708939075470},{features:[[9,11,3,3,-1.],[9,12,3,1,3.]],threshold:2.4144679773598909e-003,right_val:0.6459717750549316,left_val:0.4787439107894898},{features:[[3,12,9,2,-1.],[3,13,9,1,2.]],threshold:4.4391240226104856e-004,right_val:0.6010255813598633,left_val:0.4409308135509491},{features:[[9,9,2,2,-1.],[9,10,2,1,2.]],threshold:-2.2611189342569560e-004,right_val:0.5493255853652954,left_val:0.4038113951683044}],threshold:50.1697311401367190},{simpleClassifiers:[{features:[[3,4,13,6,-1.],[3,6,13,2,3.]],threshold:-0.0469012893736362,right_val:0.3743801116943359,left_val:0.6600171923637390},{features:[[9,7,6,4,-1.],[12,7,3,2,2.],[9,9,3,2,2.]],threshold:-1.4568349579349160e-003,right_val:0.3437797129154205,left_val:0.5783991217613220},{features:[[1,0,6,8,-1.],[4,0,3,8,2.]],threshold:5.5598369799554348e-003,right_val:0.5908216238021851,left_val:0.3622266948223114},{features:[[9,5,2,12,-1.],[9,11,2,6,2.]],threshold:7.3170487303286791e-004,right_val:0.2873558104038239,left_val:0.5500419139862061},{features:[[4,4,3,10,-1.],[4,9,3,5,2.]],threshold:1.3318009441718459e-003,right_val:0.5431019067764282,left_val:0.2673169970512390},{features:[[6,17,8,3,-1.],[6,18,8,1,3.]],threshold:2.4347059661522508e-004,right_val:0.5741388797760010,left_val:0.3855027854442596},{features:[[0,5,10,6,-1.],[0,7,10,2,3.]],threshold:-3.0512469820678234e-003,right_val:0.3462845087051392,left_val:0.5503209829330444},{features:[[13,2,3,2,-1.],[13,3,3,1,2.]],threshold:-6.8657199153676629e-004,right_val:0.5429509282112122,left_val:0.3291221857070923},{features:[[7,5,4,5,-1.],[9,5,2,5,2.]],threshold:1.4668200165033340e-003,right_val:0.5351811051368713,left_val:0.3588382005691528},{features:[[12,14,3,6,-1.],[12,16,3,2,3.]],threshold:3.2021870720200241e-004,right_val:0.5700234174728394,left_val:0.4296841919422150},{features:[[1,11,8,2,-1.],[1,12,8,1,2.]],threshold:7.4122188379988074e-004,right_val:0.3366870880126953,left_val:0.5282164812088013},{features:[[7,13,6,3,-1.],[7,14,6,1,3.]],threshold:3.8330298848450184e-003,right_val:0.6257336139678955,left_val:0.4559567868709564},{features:[[0,5,3,6,-1.],[0,7,3,2,3.]],threshold:-0.0154564399272203,right_val:0.5129452943801880,left_val:0.2350116968154907},{features:[[13,2,3,2,-1.],[13,3,3,1,2.]],threshold:2.6796779129654169e-003,right_val:0.4155062139034271,left_val:0.5329415202140808},{features:[[4,14,4,6,-1.],[4,14,2,3,2.],[6,17,2,3,2.]],threshold:2.8296569362282753e-003,right_val:0.5804538130760193,left_val:0.4273087978363037},{features:[[13,2,3,2,-1.],[13,3,3,1,2.]],threshold:-3.9444249123334885e-003,right_val:0.5202686190605164,left_val:0.2912611961364746},{features:[[8,2,4,12,-1.],[8,6,4,4,3.]],threshold:2.7179559692740440e-003,right_val:0.3585677146911621,left_val:0.5307688117027283},{features:[[14,0,6,8,-1.],[17,0,3,4,2.],[14,4,3,4,2.]],threshold:5.9077627956867218e-003,right_val:0.5941585898399353,left_val:0.4703775048255920},{features:[[7,17,3,2,-1.],[8,17,1,2,3.]],threshold:-4.2240349575877190e-003,right_val:0.5088796019554138,left_val:0.2141567021608353},{features:[[8,12,4,2,-1.],[8,13,4,1,2.]],threshold:4.0725888684391975e-003,right_val:0.6841061115264893,left_val:0.4766413867473602},{features:[[6,0,8,12,-1.],[6,0,4,6,2.],[10,6,4,6,2.]],threshold:0.0101495301350951,right_val:0.3748497068881989,left_val:0.5360798835754395},{features:[[14,0,2,10,-1.],[15,0,1,5,2.],[14,5,1,5,2.]],threshold:-1.8864999583456665e-004,right_val:0.3853805065155029,left_val:0.5720130205154419},{features:[[5,3,8,6,-1.],[5,3,4,3,2.],[9,6,4,3,2.]],threshold:-4.8864358104765415e-003,right_val:0.5340958833694458,left_val:0.3693122863769531},{features:[[14,0,6,10,-1.],[17,0,3,5,2.],[14,5,3,5,2.]],threshold:0.0261584799736738,right_val:0.6059989929199219,left_val:0.4962374866008759},{features:[[9,14,1,2,-1.],[9,15,1,1,2.]],threshold:4.8560759751126170e-004,right_val:0.6012468934059143,left_val:0.4438945949077606},{features:[[15,10,4,3,-1.],[15,11,4,1,3.]],threshold:0.0112687097862363,right_val:0.1840388029813767,left_val:0.5244250297546387},{features:[[8,14,2,3,-1.],[8,15,2,1,3.]],threshold:-2.8114619199186563e-003,right_val:0.4409897029399872,left_val:0.6060283780097961},{features:[[3,13,14,4,-1.],[10,13,7,2,2.],[3,15,7,2,2.]],threshold:-5.6112729944288731e-003,right_val:0.5589237213134766,left_val:0.3891170918941498},{features:[[1,10,4,3,-1.],[1,11,4,1,3.]],threshold:8.5680093616247177e-003,right_val:0.2062619030475617,left_val:0.5069345831871033},{features:[[9,11,6,1,-1.],[11,11,2,1,3.]],threshold:-3.8172779022715986e-004,right_val:0.4192610979080200,left_val:0.5882201790809631},{features:[[5,11,6,1,-1.],[7,11,2,1,3.]],threshold:-1.7680290329735726e-004,right_val:0.4003368914127350,left_val:0.5533605813980103},{features:[[3,5,16,15,-1.],[3,10,16,5,3.]],threshold:6.5112537704408169e-003,right_val:0.5444191098213196,left_val:0.3310146927833557},{features:[[6,12,4,2,-1.],[8,12,2,2,2.]],threshold:-6.5948683186434209e-005,right_val:0.3944905996322632,left_val:0.5433831810951233},{features:[[4,4,12,10,-1.],[10,4,6,5,2.],[4,9,6,5,2.]],threshold:6.9939051754772663e-003,right_val:0.4192714095115662,left_val:0.5600358247756958},{features:[[8,6,3,4,-1.],[9,6,1,4,3.]],threshold:-4.6744439750909805e-003,right_val:0.4604960978031158,left_val:0.6685466766357422},{features:[[8,12,4,8,-1.],[10,12,2,4,2.],[8,16,2,4,2.]],threshold:0.0115898502990603,right_val:0.2926830053329468,left_val:0.5357121229171753},{features:[[8,14,4,3,-1.],[8,15,4,1,3.]],threshold:0.0130078401416540,right_val:0.7307463288307190,left_val:0.4679817855358124},{features:[[12,2,3,2,-1.],[13,2,1,2,3.]],threshold:-1.1008579749614000e-003,right_val:0.5415065288543701,left_val:0.3937501013278961},{features:[[8,15,3,2,-1.],[8,16,3,1,2.]],threshold:6.0472649056464434e-004,right_val:0.5604041218757629,left_val:0.4242376089096069},{features:[[6,0,9,14,-1.],[9,0,3,14,3.]],threshold:-0.0144948400557041,right_val:0.5293182730674744,left_val:0.3631210029125214},{features:[[9,6,2,3,-1.],[10,6,1,3,2.]],threshold:-5.3056948818266392e-003,right_val:0.4621821045875549,left_val:0.6860452294349670},{features:[[10,8,2,3,-1.],[10,9,2,1,3.]],threshold:-8.1829127157106996e-004,right_val:0.5420439243316650,left_val:0.3944096863269806},{features:[[0,9,4,6,-1.],[0,11,4,2,3.]],threshold:-0.0190775208175182,right_val:0.5037891864776611,left_val:0.1962621957063675},{features:[[6,0,8,2,-1.],[6,1,8,1,2.]],threshold:3.5549470339901745e-004,right_val:0.5613973140716553,left_val:0.4086259007453919},{features:[[6,14,7,3,-1.],[6,15,7,1,3.]],threshold:1.9679730758070946e-003,right_val:0.5926123261451721,left_val:0.4489121139049530},{features:[[8,10,8,9,-1.],[8,13,8,3,3.]],threshold:6.9189141504466534e-003,right_val:0.3728385865688324,left_val:0.5335925817489624},{features:[[5,2,3,2,-1.],[6,2,1,2,3.]],threshold:2.9872779268771410e-003,right_val:0.2975643873214722,left_val:0.5111321210861206},{features:[[14,1,6,8,-1.],[17,1,3,4,2.],[14,5,3,4,2.]],threshold:-6.2264618463814259e-003,right_val:0.4824537932872772,left_val:0.5541489720344544},{features:[[0,1,6,8,-1.],[0,1,3,4,2.],[3,5,3,4,2.]],threshold:0.0133533002808690,right_val:0.6414797902107239,left_val:0.4586423933506012},{features:[[1,2,18,6,-1.],[10,2,9,3,2.],[1,5,9,3,2.]],threshold:0.0335052385926247,right_val:0.3429994881153107,left_val:0.5392425060272217},{features:[[9,3,2,1,-1.],[10,3,1,1,2.]],threshold:-2.5294460356235504e-003,right_val:0.5013315081596375,left_val:0.1703713983297348},{features:[[13,2,4,6,-1.],[15,2,2,3,2.],[13,5,2,3,2.]],threshold:-1.2801629491150379e-003,right_val:0.4697405099868774,left_val:0.5305461883544922},{features:[[5,4,3,3,-1.],[5,5,3,1,3.]],threshold:7.0687388069927692e-003,right_val:0.6436504721641541,left_val:0.4615545868873596},{features:[[13,5,1,3,-1.],[13,6,1,1,3.]],threshold:9.6880499040707946e-004,right_val:0.6043894290924072,left_val:0.4833599030971527},{features:[[2,16,5,3,-1.],[2,17,5,1,3.]],threshold:3.9647659286856651e-003,right_val:0.3231816887855530,left_val:0.5187637209892273},{features:[[13,2,4,6,-1.],[15,2,2,3,2.],[13,5,2,3,2.]],threshold:-0.0220577307045460,right_val:0.5200980901718140,left_val:0.4079256951808929},{features:[[3,2,4,6,-1.],[3,2,2,3,2.],[5,5,2,3,2.]],threshold:-6.6906312713399529e-004,right_val:0.3815600872039795,left_val:0.5331609249114990},{features:[[13,5,1,2,-1.],[13,6,1,1,2.]],threshold:-6.7009328631684184e-004,right_val:0.4688901901245117,left_val:0.5655422210693359},{features:[[5,5,2,2,-1.],[5,6,2,1,2.]],threshold:7.4284552829340100e-004,right_val:0.6287400126457214,left_val:0.4534381031990051},{features:[[13,9,2,2,-1.],[13,9,1,2,2.]],threshold:2.2227810695767403e-003,right_val:0.3303655982017517,left_val:0.5350633263587952},{features:[[5,9,2,2,-1.],[6,9,1,2,2.]],threshold:-5.4130521602928638e-003,right_val:0.5005434751510620,left_val:0.1113687008619309},{features:[[13,17,3,2,-1.],[13,18,3,1,2.]],threshold:-1.4520040167553816e-005,right_val:0.4325133860111237,left_val:0.5628737807273865},{features:[[6,16,4,4,-1.],[6,16,2,2,2.],[8,18,2,2,2.]],threshold:2.3369169502984732e-004,right_val:0.5447791218757629,left_val:0.4165835082530975},{features:[[9,16,2,3,-1.],[9,17,2,1,3.]],threshold:4.2894547805190086e-003,right_val:0.6778649091720581,left_val:0.4860391020774841},{features:[[0,13,9,6,-1.],[0,15,9,2,3.]],threshold:5.9103150852024555e-003,right_val:0.3612113893032074,left_val:0.5262305140495300},{features:[[9,14,2,6,-1.],[9,17,2,3,2.]],threshold:0.0129005396738648,right_val:0.3250288069248200,left_val:0.5319377183914185},{features:[[9,15,2,3,-1.],[9,16,2,1,3.]],threshold:4.6982979401946068e-003,right_val:0.6665925979614258,left_val:0.4618245065212250},{features:[[1,10,18,6,-1.],[1,12,18,2,3.]],threshold:0.0104398597031832,right_val:0.3883604109287262,left_val:0.5505670905113220},{features:[[8,11,4,2,-1.],[8,12,4,1,2.]],threshold:3.0443191062659025e-003,right_val:0.7301844954490662,left_val:0.4697853028774262},{features:[[7,9,6,2,-1.],[7,10,6,1,2.]],threshold:-6.1593751888722181e-004,right_val:0.5464984178543091,left_val:0.3830839097499847},{features:[[8,8,2,3,-1.],[8,9,2,1,3.]],threshold:-3.4247159492224455e-003,right_val:0.5089530944824219,left_val:0.2566300034523010},{features:[[17,5,3,4,-1.],[18,5,1,4,3.]],threshold:-9.3538565561175346e-003,right_val:0.4940795898437500,left_val:0.6469966173171997},{features:[[1,19,18,1,-1.],[7,19,6,1,3.]],threshold:0.0523389987647533,right_val:0.7878770828247070,left_val:0.4745982885360718},{features:[[9,0,3,2,-1.],[10,0,1,2,3.]],threshold:3.5765620414167643e-003,right_val:0.2748498022556305,left_val:0.5306664705276489},{features:[[1,8,1,6,-1.],[1,10,1,2,3.]],threshold:7.1555317845195532e-004,right_val:0.4041908979415894,left_val:0.5413125753402710},{features:[[12,17,8,3,-1.],[12,17,4,3,2.]],threshold:-0.0105166798457503,right_val:0.4815283119678497,left_val:0.6158512234687805},{features:[[0,5,3,4,-1.],[1,5,1,4,3.]],threshold:7.7347927726805210e-003,right_val:0.7028980851173401,left_val:0.4695805907249451},{features:[[9,7,2,3,-1.],[9,8,2,1,3.]],threshold:-4.3226778507232666e-003,right_val:0.5304684042930603,left_val:0.2849566042423248},{features:[[7,11,2,2,-1.],[7,11,1,1,2.],[8,12,1,1,2.]],threshold:-2.5534399319440126e-003,right_val:0.4688892066478729,left_val:0.7056984901428223},{features:[[11,3,2,5,-1.],[11,3,1,5,2.]],threshold:1.0268510231981054e-004,right_val:0.5573464035987854,left_val:0.3902932107448578},{features:[[7,3,2,5,-1.],[8,3,1,5,2.]],threshold:7.1395188570022583e-006,right_val:0.5263987779617310,left_val:0.3684231936931610},{features:[[15,13,2,3,-1.],[15,14,2,1,3.]],threshold:-1.6711989883333445e-003,right_val:0.5387271046638489,left_val:0.3849175870418549},{features:[[5,6,2,3,-1.],[5,7,2,1,3.]],threshold:4.9260449595749378e-003,right_val:0.7447251081466675,left_val:0.4729771912097931},{features:[[4,19,15,1,-1.],[9,19,5,1,3.]],threshold:4.3908702209591866e-003,right_val:0.5591921806335449,left_val:0.4809181094169617},{features:[[1,19,15,1,-1.],[6,19,5,1,3.]],threshold:-0.0177936293184757,right_val:0.4676927030086517,left_val:0.6903678178787231},{features:[[15,13,2,3,-1.],[15,14,2,1,3.]],threshold:2.0469669252634048e-003,right_val:0.3308162093162537,left_val:0.5370690226554871},{features:[[5,0,4,15,-1.],[7,0,2,15,2.]],threshold:0.0298914890736341,right_val:0.3309059143066406,left_val:0.5139865279197693},{features:[[9,6,2,5,-1.],[9,6,1,5,2.]],threshold:1.5494900289922953e-003,right_val:0.6078342795372009,left_val:0.4660237133502960},{features:[[9,5,2,7,-1.],[10,5,1,7,2.]],threshold:1.4956969534978271e-003,right_val:0.5863919854164124,left_val:0.4404835999011993},{features:[[16,11,3,3,-1.],[16,12,3,1,3.]],threshold:9.5885928021743894e-004,right_val:0.4208523035049439,left_val:0.5435971021652222},{features:[[1,11,3,3,-1.],[1,12,3,1,3.]],threshold:4.9643701640889049e-004,right_val:0.4000622034072876,left_val:0.5370578169822693},{features:[[6,6,8,3,-1.],[6,7,8,1,3.]],threshold:-2.7280810754746199e-003,right_val:0.4259642958641052,left_val:0.5659412741661072},{features:[[0,15,6,2,-1.],[0,16,6,1,2.]],threshold:2.3026480339467525e-003,right_val:0.3350869119167328,left_val:0.5161657929420471},{features:[[1,0,18,6,-1.],[7,0,6,6,3.]],threshold:0.2515163123607636,right_val:0.7147309780120850,left_val:0.4869661927223206},{features:[[6,0,3,4,-1.],[7,0,1,4,3.]],threshold:-4.6328022144734859e-003,right_val:0.5083789825439453,left_val:0.2727448940277100},{features:[[14,10,4,10,-1.],[16,10,2,5,2.],[14,15,2,5,2.]],threshold:-0.0404344908893108,right_val:0.5021767020225525,left_val:0.6851438879966736},{features:[[3,2,3,2,-1.],[4,2,1,2,3.]],threshold:1.4972220014897175e-005,right_val:0.5522555112838745,left_val:0.4284465014934540},{features:[[11,2,2,2,-1.],[11,3,2,1,2.]],threshold:-2.4050309730228037e-004,right_val:0.5390074849128723,left_val:0.4226118922233582},{features:[[2,10,4,10,-1.],[2,10,2,5,2.],[4,15,2,5,2.]],threshold:0.0236578397452831,right_val:0.7504366040229797,left_val:0.4744631946086884},{features:[[0,13,20,6,-1.],[10,13,10,3,2.],[0,16,10,3,2.]],threshold:-8.1449104472994804e-003,right_val:0.5538362860679627,left_val:0.4245058894157410},{features:[[0,5,2,15,-1.],[1,5,1,15,2.]],threshold:-3.6992130335420370e-003,right_val:0.4529713094234467,left_val:0.5952357053756714},{features:[[1,7,18,4,-1.],[10,7,9,2,2.],[1,9,9,2,2.]],threshold:-6.7718601785600185e-003,right_val:0.5473399758338928,left_val:0.4137794077396393},{features:[[0,0,2,17,-1.],[1,0,1,17,2.]],threshold:4.2669530957937241e-003,right_val:0.5797994136810303,left_val:0.4484114944934845},{features:[[2,6,16,6,-1.],[10,6,8,3,2.],[2,9,8,3,2.]],threshold:1.7791989957913756e-003,right_val:0.4432444870471954,left_val:0.5624858736991882},{features:[[8,14,1,3,-1.],[8,15,1,1,3.]],threshold:1.6774770338088274e-003,right_val:0.6364241838455200,left_val:0.4637751877307892},{features:[[8,15,4,2,-1.],[8,16,4,1,2.]],threshold:1.1732629500329494e-003,right_val:0.5914415717124939,left_val:0.4544503092765808},{features:[[5,2,8,2,-1.],[5,2,4,1,2.],[9,3,4,1,2.]],threshold:8.6998171173036098e-004,right_val:0.3885917961597443,left_val:0.5334752798080444},{features:[[6,11,8,6,-1.],[6,14,8,3,2.]],threshold:7.6378340600058436e-004,right_val:0.3744941949844360,left_val:0.5398585200309753},{features:[[9,13,2,2,-1.],[9,14,2,1,2.]],threshold:1.5684569370932877e-004,right_val:0.5614616274833679,left_val:0.4317873120307922},{features:[[18,4,2,6,-1.],[18,6,2,2,3.]],threshold:-0.0215113703161478,right_val:0.5185542702674866,left_val:0.1785925030708313},{features:[[9,12,2,2,-1.],[9,13,2,1,2.]],threshold:1.3081369979772717e-004,right_val:0.5682849884033203,left_val:0.4342499077320099},{features:[[18,4,2,6,-1.],[18,6,2,2,3.]],threshold:0.0219920407980680,right_val:0.2379394024610519,left_val:0.5161716938018799},{features:[[9,13,1,3,-1.],[9,14,1,1,3.]],threshold:-8.0136500764638186e-004,right_val:0.4466426968574524,left_val:0.5986763238906860},{features:[[18,4,2,6,-1.],[18,6,2,2,3.]],threshold:-8.2736099138855934e-003,right_val:0.5251057147979736,left_val:0.4108217954635620},{features:[[0,4,2,6,-1.],[0,6,2,2,3.]],threshold:3.6831789184361696e-003,right_val:0.3397518098354340,left_val:0.5173814296722412},{features:[[9,12,3,3,-1.],[9,13,3,1,3.]],threshold:-7.9525681212544441e-003,right_val:0.4845924079418182,left_val:0.6888983249664307},{features:[[3,13,2,3,-1.],[3,14,2,1,3.]],threshold:1.5382299898192286e-003,right_val:0.3454113900661469,left_val:0.5178567171096802},{features:[[13,13,4,3,-1.],[13,14,4,1,3.]],threshold:-0.0140435304492712,right_val:0.5188667774200440,left_val:0.1678421050310135},{features:[[5,4,3,3,-1.],[5,5,3,1,3.]],threshold:1.4315890148282051e-003,right_val:0.5655773878097534,left_val:0.4368256926536560},{features:[[5,2,10,6,-1.],[5,4,10,2,3.]],threshold:-0.0340142287313938,right_val:0.4959217011928558,left_val:0.7802296280860901},{features:[[3,13,4,3,-1.],[3,14,4,1,3.]],threshold:-0.0120272999629378,right_val:0.5032231807708740,left_val:0.1585101038217545},{features:[[3,7,15,5,-1.],[8,7,5,5,3.]],threshold:0.1331661939620972,right_val:0.2755128145217896,left_val:0.5163304805755615},{features:[[3,7,12,2,-1.],[7,7,4,2,3.]],threshold:-1.5221949433907866e-003,right_val:0.5214552283287048,left_val:0.3728317916393280},{features:[[10,3,3,9,-1.],[11,3,1,9,3.]],threshold:-9.3929271679371595e-004,right_val:0.4511165022850037,left_val:0.5838379263877869},{features:[[8,6,4,6,-1.],[10,6,2,6,2.]],threshold:0.0277197398245335,right_val:0.7331544756889343,left_val:0.4728286862373352},{features:[[9,7,4,3,-1.],[9,8,4,1,3.]],threshold:3.1030150130391121e-003,right_val:0.4101563096046448,left_val:0.5302202105522156},{features:[[0,9,4,9,-1.],[2,9,2,9,2.]],threshold:0.0778612196445465,right_val:0.1272961944341660,left_val:0.4998334050178528},{features:[[9,13,3,5,-1.],[10,13,1,5,3.]],threshold:-0.0158549398183823,right_val:0.5165656208992004,left_val:0.0508333593606949},{features:[[7,7,6,3,-1.],[9,7,2,3,3.]],threshold:-4.9725300632417202e-003,right_val:0.4684231877326965,left_val:0.6798133850097656},{features:[[9,7,3,5,-1.],[10,7,1,5,3.]],threshold:-9.7676506265997887e-004,right_val:0.4788931906223297,left_val:0.6010771989822388},{features:[[5,7,8,2,-1.],[9,7,4,2,2.]],threshold:-2.4647710379213095e-003,right_val:0.5220503807067871,left_val:0.3393397927284241},{features:[[5,9,12,2,-1.],[9,9,4,2,3.]],threshold:-6.7937700077891350e-003,right_val:0.5239663124084473,left_val:0.4365136921405792},{features:[[5,6,10,3,-1.],[10,6,5,3,2.]],threshold:0.0326080210506916,right_val:0.2425214946269989,left_val:0.5052723884582520},{features:[[10,12,3,1,-1.],[11,12,1,1,3.]],threshold:-5.8514421107247472e-004,right_val:0.4758574068546295,left_val:0.5733973979949951},{features:[[0,1,11,15,-1.],[0,6,11,5,3.]],threshold:-0.0296326000243425,right_val:0.5263597965240479,left_val:0.3892289102077484}],threshold:66.6691207885742190},{simpleClassifiers:[{features:[[1,0,18,6,-1.],[7,0,6,6,3.]],threshold:0.0465508513152599,right_val:0.6240522861480713,left_val:0.3276950120925903},{features:[[7,7,6,1,-1.],[9,7,2,1,3.]],threshold:7.9537127166986465e-003,right_val:0.6942939162254334,left_val:0.4256485104560852},{features:[[5,16,6,4,-1.],[5,16,3,2,2.],[8,18,3,2,2.]],threshold:6.8221561377868056e-004,right_val:0.5900732874870300,left_val:0.3711487054824829},{features:[[6,5,9,8,-1.],[6,9,9,4,2.]],threshold:-1.9348249770700932e-004,right_val:0.5300545096397400,left_val:0.2041133940219879},{features:[[5,10,2,6,-1.],[5,13,2,3,2.]],threshold:-2.6710508973337710e-004,right_val:0.3103179037570953,left_val:0.5416126251220703},{features:[[7,6,8,10,-1.],[11,6,4,5,2.],[7,11,4,5,2.]],threshold:2.7818060480058193e-003,right_val:0.3467069864273071,left_val:0.5277832746505737},{features:[[5,6,8,10,-1.],[5,6,4,5,2.],[9,11,4,5,2.]],threshold:-4.6779078547842801e-004,right_val:0.3294492065906525,left_val:0.5308231115341187},{features:[[9,5,2,2,-1.],[9,6,2,1,2.]],threshold:-3.0335160772665404e-005,right_val:0.3852097094058991,left_val:0.5773872733116150},{features:[[5,12,8,2,-1.],[5,13,8,1,2.]],threshold:7.8038009814918041e-004,right_val:0.6150057911872864,left_val:0.4317438900470734},{features:[[10,2,8,2,-1.],[10,3,8,1,2.]],threshold:-4.2553851380944252e-003,right_val:0.5324292778968811,left_val:0.2933903932571411},{features:[[4,0,2,10,-1.],[4,0,1,5,2.],[5,5,1,5,2.]],threshold:-2.4735610350035131e-004,right_val:0.3843030035495758,left_val:0.5468844771385193},{features:[[9,10,2,2,-1.],[9,11,2,1,2.]],threshold:-1.4724259381182492e-004,right_val:0.5755587220191956,left_val:0.4281542897224426},{features:[[2,8,15,3,-1.],[2,9,15,1,3.]],threshold:1.1864770203828812e-003,right_val:0.5471466183662415,left_val:0.3747301101684570},{features:[[8,13,4,3,-1.],[8,14,4,1,3.]],threshold:2.3936580400913954e-003,right_val:0.6111528873443604,left_val:0.4537783861160278},{features:[[7,2,3,2,-1.],[8,2,1,2,3.]],threshold:-1.5390539774671197e-003,right_val:0.5189538002014160,left_val:0.2971341907978058},{features:[[7,13,6,3,-1.],[7,14,6,1,3.]],threshold:-7.1968790143728256e-003,right_val:0.4726476967334747,left_val:0.6699066758155823},{features:[[9,9,2,2,-1.],[9,10,2,1,2.]],threshold:-4.1499789222143590e-004,right_val:0.5260317921638489,left_val:0.3384954035282135},{features:[[17,2,3,6,-1.],[17,4,3,2,3.]],threshold:4.4359830208122730e-003,right_val:0.3920140862464905,left_val:0.5399122238159180},{features:[[1,5,3,4,-1.],[2,5,1,4,3.]],threshold:2.6606200262904167e-003,right_val:0.6119617819786072,left_val:0.4482578039169312},{features:[[14,8,4,6,-1.],[14,10,4,2,3.]],threshold:-1.5287200221791863e-003,right_val:0.5340266227722168,left_val:0.3711237907409668},{features:[[1,4,3,8,-1.],[2,4,1,8,3.]],threshold:-4.7397250309586525e-003,right_val:0.4455145001411438,left_val:0.6031088232994080},{features:[[8,13,4,6,-1.],[8,16,4,3,2.]],threshold:-0.0148291299119592,right_val:0.5341861844062805,left_val:0.2838754057884216},{features:[[3,14,2,2,-1.],[3,15,2,1,2.]],threshold:9.2275557108223438e-004,right_val:0.3361653983592987,left_val:0.5209547281265259},{features:[[14,8,4,6,-1.],[14,10,4,2,3.]],threshold:0.0835298076272011,right_val:0.0811644494533539,left_val:0.5119969844818115},{features:[[2,8,4,6,-1.],[2,10,4,2,3.]],threshold:-7.5633148662745953e-004,right_val:0.5189831256866455,left_val:0.3317120075225830},{features:[[10,14,1,6,-1.],[10,17,1,3,2.]],threshold:9.8403859883546829e-003,right_val:0.2334959059953690,left_val:0.5247598290443420},{features:[[7,5,3,6,-1.],[8,5,1,6,3.]],threshold:-1.5953830443322659e-003,right_val:0.4295622110366821,left_val:0.5750094056129456},{features:[[11,2,2,6,-1.],[12,2,1,3,2.],[11,5,1,3,2.]],threshold:3.4766020689858124e-005,right_val:0.5564029216766357,left_val:0.4342445135116577},{features:[[6,6,6,5,-1.],[8,6,2,5,3.]],threshold:0.0298629105091095,right_val:0.6579188108444214,left_val:0.4579147100448608},{features:[[17,1,3,6,-1.],[17,3,3,2,3.]],threshold:0.0113255903124809,right_val:0.3673888146877289,left_val:0.5274311900138855},{features:[[8,7,3,5,-1.],[9,7,1,5,3.]],threshold:-8.7828645482659340e-003,right_val:0.4642167091369629,left_val:0.7100368738174439},{features:[[9,18,3,2,-1.],[10,18,1,2,3.]],threshold:4.3639959767460823e-003,right_val:0.2705877125263214,left_val:0.5279216170310974},{features:[[8,18,3,2,-1.],[9,18,1,2,3.]],threshold:4.1804728098213673e-003,right_val:0.2449083030223846,left_val:0.5072525143623352},{features:[[12,3,5,2,-1.],[12,4,5,1,2.]],threshold:-4.5668511302210391e-004,right_val:0.5548691153526306,left_val:0.4283105134963989},{features:[[7,1,5,12,-1.],[7,7,5,6,2.]],threshold:-3.7140368949621916e-003,right_val:0.4103653132915497,left_val:0.5519387722015381},{features:[[1,0,18,4,-1.],[7,0,6,4,3.]],threshold:-0.0253042895346880,right_val:0.4869889020919800,left_val:0.6867002248764038},{features:[[4,2,2,2,-1.],[4,3,2,1,2.]],threshold:-3.4454080741852522e-004,right_val:0.5287693142890930,left_val:0.3728874027729034},{features:[[11,14,4,2,-1.],[13,14,2,1,2.],[11,15,2,1,2.]],threshold:-8.3935231668874621e-004,right_val:0.4616062045097351,left_val:0.6060152053833008},{features:[[0,2,3,6,-1.],[0,4,3,2,3.]],threshold:0.0172800496220589,right_val:0.1819823980331421,left_val:0.5049635767936707},{features:[[9,7,2,3,-1.],[9,8,2,1,3.]],threshold:-6.3595077954232693e-003,right_val:0.5232778787612915,left_val:0.1631239950656891},{features:[[5,5,1,3,-1.],[5,6,1,1,3.]],threshold:1.0298109846189618e-003,right_val:0.6176549196243286,left_val:0.4463278055191040},{features:[[10,10,6,1,-1.],[10,10,3,1,2.]],threshold:1.0117109632119536e-003,right_val:0.4300698935985565,left_val:0.5473384857177734},{features:[[4,10,6,1,-1.],[7,10,3,1,2.]],threshold:-0.0103088002651930,right_val:0.5000867247581482,left_val:0.1166985034942627},{features:[[9,17,3,3,-1.],[9,18,3,1,3.]],threshold:5.4682018235325813e-003,right_val:0.6719213724136353,left_val:0.4769287109375000},{features:[[4,14,1,3,-1.],[4,15,1,1,3.]],threshold:-9.1696460731327534e-004,right_val:0.5178164839744568,left_val:0.3471089899539948},{features:[[12,5,3,3,-1.],[12,6,3,1,3.]],threshold:2.3922820109874010e-003,right_val:0.6216310858726502,left_val:0.4785236120223999},{features:[[4,5,12,3,-1.],[4,6,12,1,3.]],threshold:-7.5573818758130074e-003,right_val:0.4410085082054138,left_val:0.5814796090126038},{features:[[9,8,2,3,-1.],[9,9,2,1,3.]],threshold:-7.7024032361805439e-004,right_val:0.5465722084045410,left_val:0.3878000080585480},{features:[[4,9,3,3,-1.],[5,9,1,3,3.]],threshold:-8.7125990539789200e-003,right_val:0.4995836019515991,left_val:0.1660051047801971},{features:[[6,0,9,17,-1.],[9,0,3,17,3.]],threshold:-0.0103063201531768,right_val:0.5274233818054199,left_val:0.4093391001224518},{features:[[9,12,1,3,-1.],[9,13,1,1,3.]],threshold:-2.0940979011356831e-003,right_val:0.4572280049324036,left_val:0.6206194758415222},{features:[[9,5,2,15,-1.],[9,10,2,5,3.]],threshold:6.8099051713943481e-003,right_val:0.4155600070953369,left_val:0.5567759275436401},{features:[[8,14,2,3,-1.],[8,15,2,1,3.]],threshold:-1.0746059706434608e-003,right_val:0.4353024959564209,left_val:0.5638927817344666},{features:[[10,14,1,3,-1.],[10,15,1,1,3.]],threshold:2.1550289820879698e-003,right_val:0.6749758124351502,left_val:0.4826265871524811},{features:[[7,1,6,5,-1.],[9,1,2,5,3.]],threshold:0.0317423194646835,right_val:0.1883248984813690,left_val:0.5048379898071289},{features:[[0,0,20,2,-1.],[0,0,10,2,2.]],threshold:-0.0783827230334282,right_val:0.5260158181190491,left_val:0.2369548976421356},{features:[[2,13,5,3,-1.],[2,14,5,1,3.]],threshold:5.7415119372308254e-003,right_val:0.2776469886302948,left_val:0.5048828721046448},{features:[[9,11,2,3,-1.],[9,12,2,1,3.]],threshold:-2.9014600440859795e-003,right_val:0.4693317115306854,left_val:0.6238604784011841},{features:[[2,5,9,15,-1.],[2,10,9,5,3.]],threshold:-2.6427931152284145e-003,right_val:0.5169777274131775,left_val:0.3314141929149628},{features:[[5,0,12,10,-1.],[11,0,6,5,2.],[5,5,6,5,2.]],threshold:-0.1094966009259224,right_val:0.5183441042900085,left_val:0.2380045056343079},{features:[[5,1,2,3,-1.],[6,1,1,3,2.]],threshold:7.4075913289561868e-005,right_val:0.5362150073051453,left_val:0.4069635868072510},{features:[[10,7,6,1,-1.],[12,7,2,1,3.]],threshold:-5.0593802006915212e-004,right_val:0.4374594092369080,left_val:0.5506706237792969},{features:[[3,1,2,10,-1.],[3,1,1,5,2.],[4,6,1,5,2.]],threshold:-8.2131777890026569e-004,right_val:0.4209375977516174,left_val:0.5525709986686707},{features:[[13,7,2,1,-1.],[13,7,1,1,2.]],threshold:-6.0276539443293586e-005,right_val:0.4748266041278839,left_val:0.5455474853515625},{features:[[4,13,4,6,-1.],[4,15,4,2,3.]],threshold:6.8065142259001732e-003,right_val:0.3424577116966248,left_val:0.5157995820045471},{features:[[13,7,2,1,-1.],[13,7,1,1,2.]],threshold:1.7202789895236492e-003,right_val:0.6331263780593872,left_val:0.5013207793235779},{features:[[5,7,2,1,-1.],[6,7,1,1,2.]],threshold:-1.3016929733566940e-004,right_val:0.4226869940757752,left_val:0.5539718270301819},{features:[[2,12,18,4,-1.],[11,12,9,2,2.],[2,14,9,2,2.]],threshold:-4.8016388900578022e-003,right_val:0.5430780053138733,left_val:0.4425095021724701},{features:[[5,7,2,2,-1.],[5,7,1,1,2.],[6,8,1,1,2.]],threshold:-2.5399310979992151e-003,right_val:0.4697605073451996,left_val:0.7145782113075256},{features:[[16,3,4,2,-1.],[16,4,4,1,2.]],threshold:-1.4278929447755218e-003,right_val:0.5399605035781860,left_val:0.4070445001125336},{features:[[0,2,2,18,-1.],[0,2,1,9,2.],[1,11,1,9,2.]],threshold:-0.0251425504684448,right_val:0.4747352004051209,left_val:0.7884690761566162},{features:[[1,2,18,4,-1.],[10,2,9,2,2.],[1,4,9,2,2.]],threshold:-3.8899609353393316e-003,right_val:0.5577110052108765,left_val:0.4296191930770874},{features:[[9,14,1,3,-1.],[9,15,1,1,3.]],threshold:4.3947459198534489e-003,right_val:0.7023944258689880,left_val:0.4693162143230438},{features:[[2,12,18,4,-1.],[11,12,9,2,2.],[2,14,9,2,2.]],threshold:0.0246784202754498,right_val:0.3812510073184967,left_val:0.5242322087287903},{features:[[0,12,18,4,-1.],[0,12,9,2,2.],[9,14,9,2,2.]],threshold:0.0380476787686348,right_val:0.1687828004360199,left_val:0.5011739730834961},{features:[[11,4,5,3,-1.],[11,5,5,1,3.]],threshold:7.9424865543842316e-003,right_val:0.6369568109512329,left_val:0.4828582108020783},{features:[[6,4,7,3,-1.],[6,5,7,1,3.]],threshold:-1.5110049862414598e-003,right_val:0.4487667977809906,left_val:0.5906485915184021},{features:[[13,17,3,3,-1.],[13,18,3,1,3.]],threshold:6.4201741479337215e-003,right_val:0.2990570068359375,left_val:0.5241097807884216},{features:[[8,1,3,4,-1.],[9,1,1,4,3.]],threshold:-2.9802159406244755e-003,right_val:0.5078489780426025,left_val:0.3041465878486633},{features:[[11,4,2,4,-1.],[11,4,1,4,2.]],threshold:-7.4580078944563866e-004,right_val:0.5256826281547546,left_val:0.4128139019012451},{features:[[0,17,9,3,-1.],[3,17,3,3,3.]],threshold:-0.0104709500446916,right_val:0.4494296014308929,left_val:0.5808395147323608},{features:[[11,0,2,8,-1.],[12,0,1,4,2.],[11,4,1,4,2.]],threshold:9.3369204550981522e-003,right_val:0.2658948898315430,left_val:0.5246552824974060},{features:[[0,8,6,12,-1.],[0,8,3,6,2.],[3,14,3,6,2.]],threshold:0.0279369000345469,right_val:0.7087256908416748,left_val:0.4674955010414124},{features:[[10,7,4,12,-1.],[10,13,4,6,2.]],threshold:7.4277678504586220e-003,right_val:0.3758518099784851,left_val:0.5409486889839172},{features:[[5,3,8,14,-1.],[5,10,8,7,2.]],threshold:-0.0235845092684031,right_val:0.5238550901412964,left_val:0.3758639991283417},{features:[[14,10,6,1,-1.],[14,10,3,1,2.]],threshold:1.1452640173956752e-003,right_val:0.5804247260093689,left_val:0.4329578876495361},{features:[[0,4,10,4,-1.],[0,6,10,2,2.]],threshold:-4.3468660442158580e-004,right_val:0.3873069882392883,left_val:0.5280618071556091},{features:[[10,0,5,8,-1.],[10,4,5,4,2.]],threshold:0.0106485402211547,right_val:0.5681251883506775,left_val:0.4902113080024719},{features:[[8,1,4,8,-1.],[8,1,2,4,2.],[10,5,2,4,2.]],threshold:-3.9418050437234342e-004,right_val:0.4318251013755798,left_val:0.5570880174636841},{features:[[9,11,6,1,-1.],[11,11,2,1,3.]],threshold:-1.3270479394122958e-004,right_val:0.4343554973602295,left_val:0.5658439993858337},{features:[[8,9,3,4,-1.],[9,9,1,4,3.]],threshold:-2.0125510636717081e-003,right_val:0.4537523984909058,left_val:0.6056739091873169},{features:[[18,4,2,6,-1.],[18,6,2,2,3.]],threshold:2.4854319635778666e-003,right_val:0.4138010144233704,left_val:0.5390477180480957},{features:[[8,8,3,4,-1.],[9,8,1,4,3.]],threshold:1.8237880431115627e-003,right_val:0.5717188715934753,left_val:0.4354828894138336},{features:[[7,1,13,3,-1.],[7,2,13,1,3.]],threshold:-0.0166566595435143,right_val:0.5216122865676880,left_val:0.3010913133621216},{features:[[7,13,6,1,-1.],[9,13,2,1,3.]],threshold:8.0349558265879750e-004,right_val:0.3818396925926209,left_val:0.5300151109695435},{features:[[12,11,3,6,-1.],[12,13,3,2,3.]],threshold:3.4170378930866718e-003,right_val:0.4241400063037872,left_val:0.5328028798103333},{features:[[5,11,6,1,-1.],[7,11,2,1,3.]],threshold:-3.6222729249857366e-004,right_val:0.4186977148056030,left_val:0.5491728186607361},{features:[[1,4,18,10,-1.],[10,4,9,5,2.],[1,9,9,5,2.]],threshold:-0.1163002029061317,right_val:0.5226451158523560,left_val:0.1440722048282623},{features:[[8,6,4,9,-1.],[8,9,4,3,3.]],threshold:-0.0146950101479888,right_val:0.4715717136859894,left_val:0.7747725248336792},{features:[[8,6,4,3,-1.],[8,7,4,1,3.]],threshold:2.1972130052745342e-003,right_val:0.3315644860267639,left_val:0.5355433821678162},{features:[[8,7,3,3,-1.],[9,7,1,3,3.]],threshold:-4.6965209185145795e-004,right_val:0.4458136856555939,left_val:0.5767235159873962},{features:[[14,15,4,3,-1.],[14,16,4,1,3.]],threshold:6.5144998952746391e-003,right_val:0.3647888898849487,left_val:0.5215674042701721},{features:[[5,10,3,10,-1.],[6,10,1,10,3.]],threshold:0.0213000606745481,right_val:0.1567950993776321,left_val:0.4994204938411713},{features:[[8,15,4,3,-1.],[8,16,4,1,3.]],threshold:3.1881409231573343e-003,right_val:0.6287270188331604,left_val:0.4742200076580048},{features:[[0,8,1,6,-1.],[0,10,1,2,3.]],threshold:9.0019777417182922e-004,right_val:0.3943752050399780,left_val:0.5347954034805298},{features:[[10,15,1,3,-1.],[10,16,1,1,3.]],threshold:-5.1772277802228928e-003,right_val:0.5013138055801392,left_val:0.6727191805839539},{features:[[2,15,4,3,-1.],[2,16,4,1,3.]],threshold:-4.3764649890363216e-003,right_val:0.5128793120384216,left_val:0.3106675148010254},{features:[[18,3,2,8,-1.],[19,3,1,4,2.],[18,7,1,4,2.]],threshold:2.6299960445612669e-003,right_val:0.5755215883255005,left_val:0.4886310100555420},{features:[[0,3,2,8,-1.],[0,3,1,4,2.],[1,7,1,4,2.]],threshold:-2.0458688959479332e-003,right_val:0.4558076858520508,left_val:0.6025794148445129},{features:[[3,7,14,10,-1.],[10,7,7,5,2.],[3,12,7,5,2.]],threshold:0.0694827064871788,right_val:0.2185259014368057,left_val:0.5240747928619385},{features:[[0,7,19,3,-1.],[0,8,19,1,3.]],threshold:0.0240489393472672,right_val:0.2090622037649155,left_val:0.5011867284774780},{features:[[12,6,3,3,-1.],[12,7,3,1,3.]],threshold:3.1095340382307768e-003,right_val:0.7108548283576965,left_val:0.4866712093353272},{features:[[0,6,1,3,-1.],[0,7,1,1,3.]],threshold:-1.2503260513767600e-003,right_val:0.5156195163726807,left_val:0.3407891094684601},{features:[[12,6,3,3,-1.],[12,7,3,1,3.]],threshold:-1.0281190043315291e-003,right_val:0.4439432024955750,left_val:0.5575572252273560},{features:[[5,6,3,3,-1.],[5,7,3,1,3.]],threshold:-8.8893622159957886e-003,right_val:0.4620442092418671,left_val:0.6402000784873962},{features:[[8,2,4,2,-1.],[8,3,4,1,2.]],threshold:-6.1094801640138030e-004,right_val:0.5448899865150452,left_val:0.3766441941261292},{features:[[6,3,4,12,-1.],[8,3,2,12,2.]],threshold:-5.7686357758939266e-003,right_val:0.5133677124977112,left_val:0.3318648934364319},{features:[[13,6,2,3,-1.],[13,7,2,1,3.]],threshold:1.8506490159779787e-003,right_val:0.6406934857368469,left_val:0.4903570115566254},{features:[[0,10,20,4,-1.],[0,12,20,2,2.]],threshold:-0.0997994691133499,right_val:0.5015562176704407,left_val:0.1536051034927368},{features:[[2,0,17,14,-1.],[2,7,17,7,2.]],threshold:-0.3512834906578064,right_val:0.5174378752708435,left_val:0.0588231310248375},{features:[[0,0,6,10,-1.],[0,0,3,5,2.],[3,5,3,5,2.]],threshold:-0.0452445708215237,right_val:0.4677872955799103,left_val:0.6961488723754883},{features:[[14,6,6,4,-1.],[14,6,3,4,2.]],threshold:0.0714815780520439,right_val:0.1038092970848084,left_val:0.5167986154556274},{features:[[0,6,6,4,-1.],[3,6,3,4,2.]],threshold:2.1895780228078365e-003,right_val:0.5532060861587524,left_val:0.4273078143596649},{features:[[13,2,7,2,-1.],[13,3,7,1,2.]],threshold:-5.9242651332169771e-004,right_val:0.5276389122009277,left_val:0.4638943970203400},{features:[[0,2,7,2,-1.],[0,3,7,1,2.]],threshold:1.6788389766588807e-003,right_val:0.3932034969329834,left_val:0.5301648974418640},{features:[[6,11,14,2,-1.],[13,11,7,1,2.],[6,12,7,1,2.]],threshold:-2.2163488902151585e-003,right_val:0.4757033884525299,left_val:0.5630694031715393},{features:[[8,5,2,2,-1.],[8,5,1,1,2.],[9,6,1,1,2.]],threshold:1.1568699846975505e-004,right_val:0.5535702705383301,left_val:0.4307535886764526},{features:[[13,9,2,3,-1.],[13,9,1,3,2.]],threshold:-7.2017288766801357e-003,right_val:0.5193064212799072,left_val:0.1444882005453110},{features:[[1,1,3,12,-1.],[2,1,1,12,3.]],threshold:8.9081272017210722e-004,right_val:0.5593621134757996,left_val:0.4384432137012482},{features:[[17,4,1,3,-1.],[17,5,1,1,3.]],threshold:1.9605009583756328e-004,right_val:0.4705956876277924,left_val:0.5340415835380554},{features:[[2,4,1,3,-1.],[2,5,1,1,3.]],threshold:5.2022142335772514e-004,right_val:0.3810079097747803,left_val:0.5213856101036072},{features:[[14,5,1,3,-1.],[14,6,1,1,3.]],threshold:9.4588572392240167e-004,right_val:0.6130738854408264,left_val:0.4769414961338043},{features:[[7,16,2,3,-1.],[7,17,2,1,3.]],threshold:9.1698471806012094e-005,right_val:0.5429363250732422,left_val:0.4245009124279022},{features:[[8,13,4,6,-1.],[10,13,2,3,2.],[8,16,2,3,2.]],threshold:2.1833200007677078e-003,right_val:0.4191075861454010,left_val:0.5457730889320374},{features:[[5,5,1,3,-1.],[5,6,1,1,3.]],threshold:-8.6039671441540122e-004,right_val:0.4471659958362579,left_val:0.5764588713645935},{features:[[16,0,4,20,-1.],[16,0,2,20,2.]],threshold:-0.0132362395524979,right_val:0.4695009887218475,left_val:0.6372823119163513},{features:[[5,1,2,6,-1.],[5,1,1,3,2.],[6,4,1,3,2.]],threshold:4.3376701069064438e-004,right_val:0.3945829868316650,left_val:0.5317873954772949}],threshold:67.6989212036132810},{simpleClassifiers:[{features:[[5,4,10,4,-1.],[5,6,10,2,2.]],threshold:-0.0248471498489380,right_val:0.3873311877250671,left_val:0.6555516719818115},{features:[[15,2,4,12,-1.],[15,2,2,12,2.]],threshold:6.1348611488938332e-003,right_val:0.5973997712135315,left_val:0.3748072087764740},{features:[[7,6,4,12,-1.],[7,12,4,6,2.]],threshold:6.4498498104512691e-003,right_val:0.2548811137676239,left_val:0.5425491929054260},{features:[[14,5,1,8,-1.],[14,9,1,4,2.]],threshold:6.3491211039945483e-004,right_val:0.5387253761291504,left_val:0.2462442070245743},{features:[[1,4,14,10,-1.],[1,4,7,5,2.],[8,9,7,5,2.]],threshold:1.4023890253156424e-003,right_val:0.3528657853603363,left_val:0.5594322085380554},{features:[[11,6,6,14,-1.],[14,6,3,7,2.],[11,13,3,7,2.]],threshold:3.0044000595808029e-004,right_val:0.5765938162803650,left_val:0.3958503901958466},{features:[[3,6,6,14,-1.],[3,6,3,7,2.],[6,13,3,7,2.]],threshold:1.0042409849120304e-004,right_val:0.5534998178482056,left_val:0.3698996901512146},{features:[[4,9,15,2,-1.],[9,9,5,2,3.]],threshold:-5.0841490738093853e-003,right_val:0.5547800064086914,left_val:0.3711090981960297},{features:[[7,14,6,3,-1.],[7,15,6,1,3.]],threshold:-0.0195372607558966,right_val:0.4579297006130219,left_val:0.7492755055427551},{features:[[6,3,14,4,-1.],[13,3,7,2,2.],[6,5,7,2,2.]],threshold:-7.4532740654831287e-006,right_val:0.3904069960117340,left_val:0.5649787187576294},{features:[[1,9,15,2,-1.],[6,9,5,2,3.]],threshold:-3.6079459823668003e-003,right_val:0.5267801284790039,left_val:0.3381088078022003},{features:[[6,11,8,9,-1.],[6,14,8,3,3.]],threshold:2.0697501022368670e-003,right_val:0.3714388906955719,left_val:0.5519291162490845},{features:[[7,4,3,8,-1.],[8,4,1,8,3.]],threshold:-4.6463840408250690e-004,right_val:0.4113566875457764,left_val:0.5608214735984802},{features:[[14,6,2,6,-1.],[14,9,2,3,2.]],threshold:7.5490452582016587e-004,right_val:0.5329356193542481,left_val:0.3559206128120422},{features:[[5,7,6,4,-1.],[5,7,3,2,2.],[8,9,3,2,2.]],threshold:-9.8322238773107529e-004,right_val:0.3763205111026764,left_val:0.5414795875549316},{features:[[1,1,18,19,-1.],[7,1,6,19,3.]],threshold:-0.0199406407773495,right_val:0.4705299139022827,left_val:0.6347903013229370},{features:[[1,2,6,5,-1.],[4,2,3,5,2.]],threshold:3.7680300883948803e-003,right_val:0.5563716292381287,left_val:0.3913489878177643},{features:[[12,17,6,2,-1.],[12,18,6,1,2.]],threshold:-9.4528505578637123e-003,right_val:0.5215116739273071,left_val:0.2554892897605896},{features:[[2,17,6,2,-1.],[2,18,6,1,2.]],threshold:2.9560849070549011e-003,right_val:0.3063920140266419,left_val:0.5174679160118103},{features:[[17,3,3,6,-1.],[17,5,3,2,3.]],threshold:9.1078737750649452e-003,right_val:0.2885963022708893,left_val:0.5388448238372803},{features:[[8,17,3,3,-1.],[8,18,3,1,3.]],threshold:1.8219229532405734e-003,right_val:0.5852196812629700,left_val:0.4336043000221252},{features:[[10,13,2,6,-1.],[10,16,2,3,2.]],threshold:0.0146887395530939,right_val:0.2870005965232849,left_val:0.5287361741065979},{features:[[7,13,6,3,-1.],[7,14,6,1,3.]],threshold:-0.0143879903480411,right_val:0.4647370874881744,left_val:0.7019448876380920},{features:[[17,3,3,6,-1.],[17,5,3,2,3.]],threshold:-0.0189866498112679,right_val:0.5247011780738831,left_val:0.2986552119255066},{features:[[8,13,2,3,-1.],[8,14,2,1,3.]],threshold:1.1527639580890536e-003,right_val:0.5931661725044251,left_val:0.4323473870754242},{features:[[9,3,6,2,-1.],[11,3,2,2,3.]],threshold:0.0109336702153087,right_val:0.3130319118499756,left_val:0.5286864042282105},{features:[[0,3,3,6,-1.],[0,5,3,2,3.]],threshold:-0.0149327302351594,right_val:0.5084077119827271,left_val:0.2658419013023377},{features:[[8,5,4,6,-1.],[8,7,4,2,3.]],threshold:-2.9970539617352188e-004,right_val:0.3740724027156830,left_val:0.5463526844978333},{features:[[5,5,3,2,-1.],[5,6,3,1,2.]],threshold:4.1677621193230152e-003,right_val:0.7435721755027771,left_val:0.4703496992588043},{features:[[10,1,3,4,-1.],[11,1,1,4,3.]],threshold:-6.3905320130288601e-003,right_val:0.5280538201332092,left_val:0.2069258987903595},{features:[[1,2,5,9,-1.],[1,5,5,3,3.]],threshold:4.5029609464108944e-003,right_val:0.3483543097972870,left_val:0.5182648897171021},{features:[[13,6,2,3,-1.],[13,7,2,1,3.]],threshold:-9.2040365561842918e-003,right_val:0.4932360053062439,left_val:0.6803777217864990},{features:[[0,6,14,3,-1.],[7,6,7,3,2.]],threshold:0.0813272595405579,right_val:0.2253051996231079,left_val:0.5058398842811585},{features:[[2,11,18,8,-1.],[2,15,18,4,2.]],threshold:-0.1507928073406220,right_val:0.5264679789543152,left_val:0.2963424921035767},{features:[[5,6,2,3,-1.],[5,7,2,1,3.]],threshold:3.3179009333252907e-003,right_val:0.7072932124137878,left_val:0.4655495882034302},{features:[[10,6,4,2,-1.],[12,6,2,1,2.],[10,7,2,1,2.]],threshold:7.7402801252901554e-004,right_val:0.5668237805366516,left_val:0.4780347943305969},{features:[[6,6,4,2,-1.],[6,6,2,1,2.],[8,7,2,1,2.]],threshold:6.8199541419744492e-004,right_val:0.5722156763076782,left_val:0.4286996126174927},{features:[[10,1,3,4,-1.],[11,1,1,4,3.]],threshold:5.3671570494771004e-003,right_val:0.3114621937274933,left_val:0.5299307107925415},{features:[[7,1,2,7,-1.],[8,1,1,7,2.]],threshold:9.7018666565418243e-005,right_val:0.5269461870193481,left_val:0.3674638867378235},{features:[[4,2,15,14,-1.],[4,9,15,7,2.]],threshold:-0.1253408938646317,right_val:0.5245791077613831,left_val:0.2351492047309876},{features:[[8,7,3,2,-1.],[9,7,1,2,3.]],threshold:-5.2516269497573376e-003,right_val:0.4693767130374908,left_val:0.7115936875343323},{features:[[2,3,18,4,-1.],[11,3,9,2,2.],[2,5,9,2,2.]],threshold:-7.8342109918594360e-003,right_val:0.5409085750579834,left_val:0.4462651014328003},{features:[[9,7,2,2,-1.],[10,7,1,2,2.]],threshold:-1.1310069821774960e-003,right_val:0.4417662024497986,left_val:0.5945618748664856},{features:[[13,9,2,3,-1.],[13,9,1,3,2.]],threshold:1.7601120052859187e-003,right_val:0.3973453044891357,left_val:0.5353249907493591},{features:[[5,2,6,2,-1.],[7,2,2,2,3.]],threshold:-8.1581249833106995e-004,right_val:0.5264726877212524,left_val:0.3760268092155457},{features:[[9,5,2,7,-1.],[9,5,1,7,2.]],threshold:-3.8687589112669230e-003,right_val:0.4749819934368134,left_val:0.6309912800788879},{features:[[5,9,2,3,-1.],[6,9,1,3,2.]],threshold:1.5207129763439298e-003,right_val:0.3361223936080933,left_val:0.5230181813240051},{features:[[6,0,14,18,-1.],[6,9,14,9,2.]],threshold:0.5458673834800720,right_val:0.1172635033726692,left_val:0.5167139768600464},{features:[[2,16,6,3,-1.],[2,17,6,1,3.]],threshold:0.0156501904129982,right_val:0.1393294930458069,left_val:0.4979439079761505},{features:[[9,7,3,6,-1.],[10,7,1,6,3.]],threshold:-0.0117318602278829,right_val:0.4921196103096008,left_val:0.7129650712013245},{features:[[7,8,4,3,-1.],[7,9,4,1,3.]],threshold:-6.1765122227370739e-003,right_val:0.5049701929092407,left_val:0.2288102954626083},{features:[[7,12,6,3,-1.],[7,13,6,1,3.]],threshold:2.2457661107182503e-003,right_val:0.6048725843429565,left_val:0.4632433950901032},{features:[[9,12,2,3,-1.],[9,13,2,1,3.]],threshold:-5.1915869116783142e-003,right_val:0.4602192938327789,left_val:0.6467421054840088},{features:[[7,12,6,2,-1.],[9,12,2,2,3.]],threshold:-0.0238278806209564,right_val:0.5226079225540161,left_val:0.1482000946998596},{features:[[5,11,4,6,-1.],[5,14,4,3,2.]],threshold:1.0284580057486892e-003,right_val:0.3375957012176514,left_val:0.5135489106178284},{features:[[11,12,7,2,-1.],[11,13,7,1,2.]],threshold:-0.0100788502022624,right_val:0.5303567051887512,left_val:0.2740561068058014},{features:[[6,10,8,6,-1.],[6,10,4,3,2.],[10,13,4,3,2.]],threshold:2.6168930344283581e-003,right_val:0.3972454071044922,left_val:0.5332670807838440},{features:[[11,10,3,4,-1.],[11,12,3,2,2.]],threshold:5.4385367548093200e-004,right_val:0.4063411951065064,left_val:0.5365604162216187},{features:[[9,16,2,3,-1.],[9,17,2,1,3.]],threshold:5.3510512225329876e-003,right_val:0.6889045834541321,left_val:0.4653759002685547},{features:[[13,3,1,9,-1.],[13,6,1,3,3.]],threshold:-1.5274790348485112e-003,right_val:0.3624723851680756,left_val:0.5449501276016235},{features:[[1,13,14,6,-1.],[1,15,14,2,3.]],threshold:-0.0806244164705276,right_val:0.5000287294387817,left_val:0.1656087040901184},{features:[[13,6,1,6,-1.],[13,9,1,3,2.]],threshold:0.0221920292824507,right_val:0.2002808004617691,left_val:0.5132731199264526},{features:[[0,4,3,8,-1.],[1,4,1,8,3.]],threshold:7.3100631125271320e-003,right_val:0.6366536021232605,left_val:0.4617947936058044},{features:[[18,0,2,18,-1.],[18,0,1,18,2.]],threshold:-6.4063072204589844e-003,right_val:0.4867860972881317,left_val:0.5916250944137573},{features:[[2,3,6,2,-1.],[2,4,6,1,2.]],threshold:-7.6415040530264378e-004,right_val:0.5315797924995422,left_val:0.3888409137725830},{features:[[9,0,8,6,-1.],[9,2,8,2,3.]],threshold:7.6734489994123578e-004,right_val:0.5605279803276062,left_val:0.4159064888954163},{features:[[6,6,1,6,-1.],[6,9,1,3,2.]],threshold:6.1474501853808761e-004,right_val:0.5120148062705994,left_val:0.3089022040367127},{features:[[14,8,6,3,-1.],[14,9,6,1,3.]],threshold:-5.0105270929634571e-003,right_val:0.5207306146621704,left_val:0.3972199857234955},{features:[[0,0,2,18,-1.],[1,0,1,18,2.]],threshold:-8.6909132078289986e-003,right_val:0.4608575999736786,left_val:0.6257408261299133},{features:[[1,18,18,2,-1.],[10,18,9,1,2.],[1,19,9,1,2.]],threshold:-0.0163914598524570,right_val:0.5242266058921814,left_val:0.2085209935903549},{features:[[3,15,2,2,-1.],[3,16,2,1,2.]],threshold:4.0973909199237823e-004,right_val:0.3780320882797241,left_val:0.5222427248954773},{features:[[8,14,5,3,-1.],[8,15,5,1,3.]],threshold:-2.5242289993911982e-003,right_val:0.4611890017986298,left_val:0.5803927183151245},{features:[[8,14,2,3,-1.],[8,15,2,1,3.]],threshold:5.0945312250405550e-004,right_val:0.5846015810966492,left_val:0.4401271939277649},{features:[[12,3,3,3,-1.],[13,3,1,3,3.]],threshold:1.9656419754028320e-003,right_val:0.4184590876102448,left_val:0.5322325229644775},{features:[[7,5,6,2,-1.],[9,5,2,2,3.]],threshold:5.6298897834494710e-004,right_val:0.5234565734863281,left_val:0.3741844892501831},{features:[[15,5,5,2,-1.],[15,6,5,1,2.]],threshold:-6.7946797935292125e-004,right_val:0.5356478095054627,left_val:0.4631041884422302},{features:[[0,5,5,2,-1.],[0,6,5,1,2.]],threshold:7.2856349870562553e-003,right_val:0.2377564013004303,left_val:0.5044670104980469},{features:[[17,14,1,6,-1.],[17,17,1,3,2.]],threshold:-0.0174594894051552,right_val:0.5050435066223145,left_val:0.7289121150970459},{features:[[2,9,9,3,-1.],[5,9,3,3,3.]],threshold:-0.0254217498004436,right_val:0.4678100049495697,left_val:0.6667134761810303},{features:[[12,3,3,3,-1.],[13,3,1,3,3.]],threshold:-1.5647639520466328e-003,right_val:0.5323626995086670,left_val:0.4391759037971497},{features:[[0,0,4,18,-1.],[2,0,2,18,2.]],threshold:0.0114443600177765,right_val:0.5680012106895447,left_val:0.4346440136432648},{features:[[17,6,1,3,-1.],[17,7,1,1,3.]],threshold:-6.7352550104260445e-004,right_val:0.5296812057495117,left_val:0.4477140903472900},{features:[[2,14,1,6,-1.],[2,17,1,3,2.]],threshold:9.3194209039211273e-003,right_val:0.7462607026100159,left_val:0.4740200042724609},{features:[[19,8,1,2,-1.],[19,9,1,1,2.]],threshold:1.3328490604180843e-004,right_val:0.4752134978771210,left_val:0.5365061759948731},{features:[[5,3,3,3,-1.],[6,3,1,3,3.]],threshold:-7.8815799206495285e-003,right_val:0.5015255212783814,left_val:0.1752219051122665},{features:[[9,16,2,3,-1.],[9,17,2,1,3.]],threshold:-5.7985680177807808e-003,right_val:0.4896200895309448,left_val:0.7271236777305603},{features:[[2,6,1,3,-1.],[2,7,1,1,3.]],threshold:-3.8922499516047537e-004,right_val:0.5344941020011902,left_val:0.4003908932209015},{features:[[12,4,8,2,-1.],[16,4,4,1,2.],[12,5,4,1,2.]],threshold:-1.9288610201328993e-003,right_val:0.4803955852985382,left_val:0.5605612993240356},{features:[[0,4,8,2,-1.],[0,4,4,1,2.],[4,5,4,1,2.]],threshold:8.4214154630899429e-003,right_val:0.7623608708381653,left_val:0.4753246903419495},{features:[[2,16,18,4,-1.],[2,18,18,2,2.]],threshold:8.1655876711010933e-003,right_val:0.4191643893718720,left_val:0.5393261909484863},{features:[[7,15,2,4,-1.],[7,17,2,2,2.]],threshold:4.8280550981871784e-004,right_val:0.5399821996688843,left_val:0.4240800142288208},{features:[[4,0,14,3,-1.],[4,1,14,1,3.]],threshold:-2.7186630759388208e-003,right_val:0.5424923896789551,left_val:0.4244599938392639},{features:[[0,0,4,20,-1.],[2,0,2,20,2.]],threshold:-0.0125072300434113,right_val:0.4550411105155945,left_val:0.5895841717720032},{features:[[12,4,4,8,-1.],[14,4,2,4,2.],[12,8,2,4,2.]],threshold:-0.0242865197360516,right_val:0.5189179778099060,left_val:0.2647134959697723},{features:[[6,7,2,2,-1.],[6,7,1,1,2.],[7,8,1,1,2.]],threshold:-2.9676330741494894e-003,right_val:0.4749749898910523,left_val:0.7347682714462280},{features:[[10,6,2,3,-1.],[10,7,2,1,3.]],threshold:-0.0125289997085929,right_val:0.5177599787712097,left_val:0.2756049931049347},{features:[[8,7,3,2,-1.],[8,8,3,1,2.]],threshold:-1.0104000102728605e-003,right_val:0.5144724249839783,left_val:0.3510560989379883},{features:[[8,2,6,12,-1.],[8,8,6,6,2.]],threshold:-2.1348530426621437e-003,right_val:0.4667319953441620,left_val:0.5637925863265991},{features:[[4,0,11,12,-1.],[4,4,11,4,3.]],threshold:0.0195642597973347,right_val:0.6137639880180359,left_val:0.4614573121070862},{features:[[14,9,6,11,-1.],[16,9,2,11,3.]],threshold:-0.0971463471651077,right_val:0.5193555951118469,left_val:0.2998378872871399},{features:[[0,14,4,3,-1.],[0,15,4,1,3.]],threshold:4.5014568604528904e-003,right_val:0.3045755922794342,left_val:0.5077884793281555},{features:[[9,10,2,3,-1.],[9,11,2,1,3.]],threshold:6.3706971704959869e-003,right_val:0.6887500882148743,left_val:0.4861018955707550},{features:[[5,11,3,2,-1.],[5,12,3,1,2.]],threshold:-9.0721528977155685e-003,right_val:0.5017563104629517,left_val:0.1673395931720734},{features:[[9,15,3,3,-1.],[10,15,1,3,3.]],threshold:-5.3537208586931229e-003,right_val:0.5242633223533630,left_val:0.2692756950855255},{features:[[8,8,3,4,-1.],[9,8,1,4,3.]],threshold:-0.0109328404068947,right_val:0.4736028909683228,left_val:0.7183864116668701},{features:[[9,15,3,3,-1.],[10,15,1,3,3.]],threshold:8.2356072962284088e-003,right_val:0.2389862984418869,left_val:0.5223966836929321},{features:[[7,7,3,2,-1.],[8,7,1,2,3.]],threshold:-1.0038160253316164e-003,right_val:0.4433943033218384,left_val:0.5719355940818787},{features:[[2,10,16,4,-1.],[10,10,8,2,2.],[2,12,8,2,2.]],threshold:4.0859128348529339e-003,right_val:0.4148836135864258,left_val:0.5472841858863831},{features:[[2,3,4,17,-1.],[4,3,2,17,2.]],threshold:0.1548541933298111,right_val:0.0610615983605385,left_val:0.4973812103271484},{features:[[15,13,2,7,-1.],[15,13,1,7,2.]],threshold:2.0897459762636572e-004,right_val:0.5423889160156250,left_val:0.4709174036979675},{features:[[2,2,6,1,-1.],[5,2,3,1,2.]],threshold:3.3316991175524890e-004,right_val:0.5300992131233215,left_val:0.4089626967906952},{features:[[5,2,12,4,-1.],[9,2,4,4,3.]],threshold:-0.0108134001493454,right_val:0.4957334101200104,left_val:0.6104369759559631},{features:[[6,0,8,12,-1.],[6,0,4,6,2.],[10,6,4,6,2.]],threshold:0.0456560105085373,right_val:0.2866660058498383,left_val:0.5069689154624939},{features:[[13,7,2,2,-1.],[14,7,1,1,2.],[13,8,1,1,2.]],threshold:1.2569549726322293e-003,right_val:0.6318171024322510,left_val:0.4846917092800140},{features:[[0,12,20,6,-1.],[0,14,20,2,3.]],threshold:-0.1201507002115250,right_val:0.4980959892272949,left_val:0.0605261400341988},{features:[[14,7,2,3,-1.],[14,7,1,3,2.]],threshold:-1.0533799650147557e-004,right_val:0.4708042144775391,left_val:0.5363109707832336},{features:[[0,8,9,12,-1.],[3,8,3,12,3.]],threshold:-0.2070319056510925,right_val:0.4979098141193390,left_val:0.0596603304147720},{features:[[3,0,16,2,-1.],[3,0,8,2,2.]],threshold:1.2909180077258497e-004,right_val:0.5377997756004334,left_val:0.4712977111339569},{features:[[6,15,3,3,-1.],[6,16,3,1,3.]],threshold:3.8818528992123902e-004,right_val:0.5534191131591797,left_val:0.4363538026809692},{features:[[8,15,6,3,-1.],[8,16,6,1,3.]],threshold:-2.9243610333651304e-003,right_val:0.4825215935707092,left_val:0.5811185836791992},{features:[[0,10,1,6,-1.],[0,12,1,2,3.]],threshold:8.3882332546636462e-004,right_val:0.4038138985633850,left_val:0.5311700105667114},{features:[[10,9,4,3,-1.],[10,10,4,1,3.]],threshold:-1.9061550265178084e-003,right_val:0.5260015130043030,left_val:0.3770701885223389},{features:[[9,15,2,3,-1.],[9,16,2,1,3.]],threshold:8.9514348655939102e-003,right_val:0.7682183980941773,left_val:0.4766167998313904},{features:[[5,7,10,1,-1.],[5,7,5,1,2.]],threshold:0.0130834598094225,right_val:0.3062222003936768,left_val:0.5264462828636169},{features:[[4,0,12,19,-1.],[10,0,6,19,2.]],threshold:-0.2115933001041412,right_val:0.4695810079574585,left_val:0.6737198233604431},{features:[[0,6,20,6,-1.],[10,6,10,3,2.],[0,9,10,3,2.]],threshold:3.1493250280618668e-003,right_val:0.4386953115463257,left_val:0.5644835233688355},{features:[[3,6,2,2,-1.],[3,6,1,1,2.],[4,7,1,1,2.]],threshold:3.9754100725986063e-004,right_val:0.5895630121231079,left_val:0.4526061117649078},{features:[[15,6,2,2,-1.],[16,6,1,1,2.],[15,7,1,1,2.]],threshold:-1.3814480043947697e-003,right_val:0.4942413866519928,left_val:0.6070582270622253},{features:[[3,6,2,2,-1.],[3,6,1,1,2.],[4,7,1,1,2.]],threshold:-5.8122188784182072e-004,right_val:0.4508252143859863,left_val:0.5998213291168213},{features:[[14,4,1,12,-1.],[14,10,1,6,2.]],threshold:-2.3905329871922731e-003,right_val:0.5223848223686218,left_val:0.4205588996410370},{features:[[2,5,16,10,-1.],[2,5,8,5,2.],[10,10,8,5,2.]],threshold:0.0272689294070005,right_val:0.3563301861286163,left_val:0.5206447243690491},{features:[[9,17,3,2,-1.],[10,17,1,2,3.]],threshold:-3.7658358924090862e-003,right_val:0.5218814015388489,left_val:0.3144704103469849},{features:[[1,4,2,2,-1.],[1,5,2,1,2.]],threshold:-1.4903489500284195e-003,right_val:0.5124437212944031,left_val:0.3380196094512940},{features:[[5,0,15,5,-1.],[10,0,5,5,3.]],threshold:-0.0174282304942608,right_val:0.4919725954532623,left_val:0.5829960703849793},{features:[[0,0,15,5,-1.],[5,0,5,5,3.]],threshold:-0.0152780301868916,right_val:0.4617887139320374,left_val:0.6163144707679749},{features:[[11,2,2,17,-1.],[11,2,1,17,2.]],threshold:0.0319956094026566,right_val:0.1712764054536820,left_val:0.5166357159614563},{features:[[7,2,2,17,-1.],[8,2,1,17,2.]],threshold:-3.8256710395216942e-003,right_val:0.5131387710571289,left_val:0.3408012092113495},{features:[[15,11,2,9,-1.],[15,11,1,9,2.]],threshold:-8.5186436772346497e-003,right_val:0.4997941851615906,left_val:0.6105518937110901},{features:[[3,11,2,9,-1.],[4,11,1,9,2.]],threshold:9.0641621500253677e-004,right_val:0.5582311153411865,left_val:0.4327270984649658},{features:[[5,16,14,4,-1.],[5,16,7,4,2.]],threshold:0.0103448498994112,right_val:0.5452420115470886,left_val:0.4855653047561646}],threshold:69.2298736572265630},{simpleClassifiers:[{features:[[1,4,18,1,-1.],[7,4,6,1,3.]],threshold:7.8981826081871986e-003,right_val:0.5946462154388428,left_val:0.3332524895668030},{features:[[13,7,6,4,-1.],[16,7,3,2,2.],[13,9,3,2,2.]],threshold:1.6170160379260778e-003,right_val:0.5577868819236755,left_val:0.3490641117095947},{features:[[9,8,2,12,-1.],[9,12,2,4,3.]],threshold:-5.5449741194024682e-004,right_val:0.3291530013084412,left_val:0.5542566180229187},{features:[[12,1,6,6,-1.],[12,3,6,2,3.]],threshold:1.5428980113938451e-003,right_val:0.5545979142189026,left_val:0.3612579107284546},{features:[[5,2,6,6,-1.],[5,2,3,3,2.],[8,5,3,3,2.]],threshold:-1.0329450014978647e-003,right_val:0.5576140284538269,left_val:0.3530139029026032},{features:[[9,16,6,4,-1.],[12,16,3,2,2.],[9,18,3,2,2.]],threshold:7.7698158565908670e-004,right_val:0.5645321011543274,left_val:0.3916778862476349},{features:[[1,2,18,3,-1.],[7,2,6,3,3.]],threshold:0.1432030051946640,right_val:0.7023633122444153,left_val:0.4667482078075409},{features:[[7,4,9,10,-1.],[7,9,9,5,2.]],threshold:-7.3866490274667740e-003,right_val:0.5289257764816284,left_val:0.3073684871196747},{features:[[5,9,4,4,-1.],[7,9,2,4,2.]],threshold:-6.2936742324382067e-004,right_val:0.4037049114704132,left_val:0.5622118115425110},{features:[[11,10,3,6,-1.],[11,13,3,3,2.]],threshold:7.8893528552725911e-004,right_val:0.3557874858379364,left_val:0.5267661213874817},{features:[[7,11,5,3,-1.],[7,12,5,1,3.]],threshold:-0.0122280502691865,right_val:0.4625549912452698,left_val:0.6668320894241333},{features:[[7,11,6,6,-1.],[10,11,3,3,2.],[7,14,3,3,2.]],threshold:3.5420239437371492e-003,right_val:0.3869673013687134,left_val:0.5521438121795654},{features:[[0,0,10,9,-1.],[0,3,10,3,3.]],threshold:-1.0585320414975286e-003,right_val:0.5320926904678345,left_val:0.3628678023815155},{features:[[13,14,1,6,-1.],[13,16,1,2,3.]],threshold:1.4935660146875307e-005,right_val:0.5363323092460632,left_val:0.4632444977760315},{features:[[0,2,3,6,-1.],[0,4,3,2,3.]],threshold:5.2537708543241024e-003,right_val:0.3265708982944489,left_val:0.5132231712341309},{features:[[8,14,4,3,-1.],[8,15,4,1,3.]],threshold:-8.2338023930788040e-003,right_val:0.4774140119552612,left_val:0.6693689823150635},{features:[[6,14,1,6,-1.],[6,16,1,2,3.]],threshold:2.1866810129722580e-005,right_val:0.5457931160926819,left_val:0.4053862094879150},{features:[[9,15,2,3,-1.],[9,16,2,1,3.]],threshold:-3.8150229956954718e-003,right_val:0.4793178141117096,left_val:0.6454995870590210},{features:[[6,4,3,3,-1.],[7,4,1,3,3.]],threshold:1.1105879675596952e-003,right_val:0.3529678881168366,left_val:0.5270407199859619},{features:[[9,0,11,3,-1.],[9,1,11,1,3.]],threshold:-5.7707689702510834e-003,right_val:0.5352957844734192,left_val:0.3803547024726868},{features:[[0,6,20,3,-1.],[0,7,20,1,3.]],threshold:-3.0158339068293571e-003,right_val:0.3887133002281189,left_val:0.5339403152465820},{features:[[10,1,1,2,-1.],[10,2,1,1,2.]],threshold:-8.5453689098358154e-004,right_val:0.5273603796958923,left_val:0.3564616143703461},{features:[[9,6,2,6,-1.],[10,6,1,6,2.]],threshold:0.0110505102202296,right_val:0.6849737763404846,left_val:0.4671907126903534},{features:[[5,8,12,1,-1.],[9,8,4,1,3.]],threshold:0.0426058396697044,right_val:0.0702200904488564,left_val:0.5151473283767700},{features:[[3,8,12,1,-1.],[7,8,4,1,3.]],threshold:-3.0781750101596117e-003,right_val:0.5152602195739746,left_val:0.3041661083698273},{features:[[9,7,3,5,-1.],[10,7,1,5,3.]],threshold:-5.4815728217363358e-003,right_val:0.4897229969501495,left_val:0.6430295705795288},{features:[[3,9,6,2,-1.],[6,9,3,2,2.]],threshold:3.1881860923022032e-003,right_val:0.3826209902763367,left_val:0.5307493209838867},{features:[[12,9,3,3,-1.],[12,10,3,1,3.]],threshold:3.5947180003859103e-004,right_val:0.5421904921531677,left_val:0.4650047123432159},{features:[[7,0,6,1,-1.],[9,0,2,1,3.]],threshold:-4.0705031715333462e-003,right_val:0.5079116225242615,left_val:0.2849679887294769},{features:[[12,9,3,3,-1.],[12,10,3,1,3.]],threshold:-0.0145941702648997,right_val:0.5128461718559265,left_val:0.2971645891666412},{features:[[7,10,2,1,-1.],[8,10,1,1,2.]],threshold:-1.1947689927183092e-004,right_val:0.4343082010746002,left_val:0.5631098151206970},{features:[[6,4,9,13,-1.],[9,4,3,13,3.]],threshold:-6.9344649091362953e-004,right_val:0.5359959006309509,left_val:0.4403578042984009},{features:[[6,8,4,2,-1.],[6,9,4,1,2.]],threshold:1.4834799912932795e-005,right_val:0.5164697766304016,left_val:0.3421008884906769},{features:[[16,2,4,6,-1.],[16,2,2,6,2.]],threshold:9.0296985581517220e-003,right_val:0.6114075183868408,left_val:0.4639343023300171},{features:[[0,17,6,3,-1.],[0,18,6,1,3.]],threshold:-8.0640818923711777e-003,right_val:0.5075494050979614,left_val:0.2820158898830414},{features:[[10,10,3,10,-1.],[10,15,3,5,2.]],threshold:0.0260621197521687,right_val:0.2688778042793274,left_val:0.5208905935287476},{features:[[8,7,3,5,-1.],[9,7,1,5,3.]],threshold:0.0173146594315767,right_val:0.6738539934158325,left_val:0.4663713872432709},{features:[[10,4,4,3,-1.],[10,4,2,3,2.]],threshold:0.0226666405797005,right_val:0.2212723940610886,left_val:0.5209349989891052},{features:[[8,4,3,8,-1.],[9,4,1,8,3.]],threshold:-2.1965929772704840e-003,right_val:0.4538190066814423,left_val:0.6063101291656494},{features:[[6,6,9,13,-1.],[9,6,3,13,3.]],threshold:-9.5282476395368576e-003,right_val:0.5247430801391602,left_val:0.4635204970836639},{features:[[6,0,8,12,-1.],[6,0,4,6,2.],[10,6,4,6,2.]],threshold:8.0943619832396507e-003,right_val:0.3913882076740265,left_val:0.5289440155029297},{features:[[14,2,6,8,-1.],[16,2,2,8,3.]],threshold:-0.0728773325681686,right_val:0.4990234971046448,left_val:0.7752001881599426},{features:[[6,0,3,6,-1.],[7,0,1,6,3.]],threshold:-6.9009521976113319e-003,right_val:0.5048090219497681,left_val:0.2428039014339447},{features:[[14,2,6,8,-1.],[16,2,2,8,3.]],threshold:-0.0113082397729158,right_val:0.4842376112937927,left_val:0.5734364986419678},{features:[[0,5,6,6,-1.],[0,8,6,3,2.]],threshold:0.0596132017672062,right_val:0.2524977028369904,left_val:0.5029836297035217},{features:[[9,12,6,2,-1.],[12,12,3,1,2.],[9,13,3,1,2.]],threshold:-2.8624620754271746e-003,right_val:0.4898459911346436,left_val:0.6073045134544373},{features:[[8,17,3,2,-1.],[9,17,1,2,3.]],threshold:4.4781449250876904e-003,right_val:0.2220316976308823,left_val:0.5015289187431335},{features:[[11,6,2,2,-1.],[12,6,1,1,2.],[11,7,1,1,2.]],threshold:-1.7513240454718471e-003,right_val:0.4933868944644928,left_val:0.6614428758621216},{features:[[1,9,18,2,-1.],[7,9,6,2,3.]],threshold:0.0401634201407433,right_val:0.3741044998168945,left_val:0.5180878043174744},{features:[[11,6,2,2,-1.],[12,6,1,1,2.],[11,7,1,1,2.]],threshold:3.4768949262797832e-004,right_val:0.5818032026290894,left_val:0.4720416963100433},{features:[[3,4,12,8,-1.],[7,4,4,8,3.]],threshold:2.6551650371402502e-003,right_val:0.5221335887908936,left_val:0.3805010914802551},{features:[[13,11,5,3,-1.],[13,12,5,1,3.]],threshold:-8.7706279009580612e-003,right_val:0.5231295228004456,left_val:0.2944166064262390},{features:[[9,10,2,3,-1.],[9,11,2,1,3.]],threshold:-5.5122091434895992e-003,right_val:0.4722816944122315,left_val:0.7346177101135254},{features:[[14,7,2,3,-1.],[14,7,1,3,2.]],threshold:6.8672042107209563e-004,right_val:0.4242413043975830,left_val:0.5452876091003418},{features:[[5,4,1,3,-1.],[5,5,1,1,3.]],threshold:5.6019669864326715e-004,right_val:0.5601285099983215,left_val:0.4398862123489380},{features:[[13,4,2,3,-1.],[13,5,2,1,3.]],threshold:2.4143769405782223e-003,right_val:0.6136621832847595,left_val:0.4741686880588532},{features:[[5,4,2,3,-1.],[5,5,2,1,3.]],threshold:-1.5680900542065501e-003,right_val:0.4516409933567047,left_val:0.6044552922248840},{features:[[9,8,2,3,-1.],[9,9,2,1,3.]],threshold:-3.6827491130679846e-003,right_val:0.5294982194900513,left_val:0.2452459037303925},{features:[[8,9,2,2,-1.],[8,10,2,1,2.]],threshold:-2.9409190756268799e-004,right_val:0.5251451134681702,left_val:0.3732838034629822},{features:[[15,14,1,4,-1.],[15,16,1,2,2.]],threshold:4.2847759323194623e-004,right_val:0.4065535068511963,left_val:0.5498809814453125},{features:[[3,12,2,2,-1.],[3,13,2,1,2.]],threshold:-4.8817070201039314e-003,right_val:0.4999957084655762,left_val:0.2139908969402313},{features:[[12,15,2,2,-1.],[13,15,1,1,2.],[12,16,1,1,2.]],threshold:2.7272020815871656e-004,right_val:0.5813428759574890,left_val:0.4650287032127380},{features:[[9,13,2,2,-1.],[9,14,2,1,2.]],threshold:2.0947199664078653e-004,right_val:0.5572792887687683,left_val:0.4387486875057221},{features:[[4,11,14,9,-1.],[4,14,14,3,3.]],threshold:0.0485011897981167,right_val:0.3212889134883881,left_val:0.5244972705841065},{features:[[7,13,4,3,-1.],[7,14,4,1,3.]],threshold:-4.5166411437094212e-003,right_val:0.4545882046222687,left_val:0.6056813001632690},{features:[[15,14,1,4,-1.],[15,16,1,2,2.]],threshold:-0.0122916800901294,right_val:0.5152214169502258,left_val:0.2040929049253464},{features:[[4,14,1,4,-1.],[4,16,1,2,2.]],threshold:4.8549679922871292e-004,right_val:0.3739503026008606,left_val:0.5237604975700378},{features:[[14,0,6,13,-1.],[16,0,2,13,3.]],threshold:0.0305560491979122,right_val:0.5938246250152588,left_val:0.4960533976554871},{features:[[4,1,2,12,-1.],[4,1,1,6,2.],[5,7,1,6,2.]],threshold:-1.5105320198927075e-004,right_val:0.4145204126834869,left_val:0.5351303815841675},{features:[[11,14,6,6,-1.],[14,14,3,3,2.],[11,17,3,3,2.]],threshold:2.4937440175563097e-003,right_val:0.5514941215515137,left_val:0.4693366885185242},{features:[[3,14,6,6,-1.],[3,14,3,3,2.],[6,17,3,3,2.]],threshold:-0.0123821301385760,right_val:0.4681667983531952,left_val:0.6791396737098694},{features:[[14,17,3,2,-1.],[14,18,3,1,2.]],threshold:-5.1333461888134480e-003,right_val:0.5229160189628601,left_val:0.3608739078044891},{features:[[3,17,3,2,-1.],[3,18,3,1,2.]],threshold:5.1919277757406235e-004,right_val:0.3633613884449005,left_val:0.5300073027610779},{features:[[14,0,6,13,-1.],[16,0,2,13,3.]],threshold:0.1506042033433914,right_val:0.2211782038211823,left_val:0.5157316923141480},{features:[[0,0,6,13,-1.],[2,0,2,13,3.]],threshold:7.7144149690866470e-003,right_val:0.5776609182357788,left_val:0.4410496950149536},{features:[[10,10,7,6,-1.],[10,12,7,2,3.]],threshold:9.4443522393703461e-003,right_val:0.3756650090217590,left_val:0.5401855111122131},{features:[[6,15,2,2,-1.],[6,15,1,1,2.],[7,16,1,1,2.]],threshold:2.5006249779835343e-004,right_val:0.5607374906539917,left_val:0.4368270933628082},{features:[[6,11,8,6,-1.],[10,11,4,3,2.],[6,14,4,3,2.]],threshold:-3.3077150583267212e-003,right_val:0.5518230795860291,left_val:0.4244799017906189},{features:[[7,6,2,2,-1.],[7,6,1,1,2.],[8,7,1,1,2.]],threshold:7.4048910755664110e-004,right_val:0.5900576710700989,left_val:0.4496962130069733},{features:[[2,2,16,6,-1.],[10,2,8,3,2.],[2,5,8,3,2.]],threshold:0.0440920516848564,right_val:0.3156355023384094,left_val:0.5293493270874023},{features:[[5,4,3,3,-1.],[5,5,3,1,3.]],threshold:3.3639909233897924e-003,right_val:0.5848662257194519,left_val:0.4483296871185303},{features:[[11,7,3,10,-1.],[11,12,3,5,2.]],threshold:-3.9760079234838486e-003,right_val:0.5483639240264893,left_val:0.4559507071971893},{features:[[6,7,3,10,-1.],[6,12,3,5,2.]],threshold:2.7716930489987135e-003,right_val:0.3792484104633331,left_val:0.5341786146163940},{features:[[10,7,3,2,-1.],[11,7,1,2,3.]],threshold:-2.4123019829858094e-004,right_val:0.4576973021030426,left_val:0.5667188763618469},{features:[[8,12,4,2,-1.],[8,13,4,1,2.]],threshold:4.9425667384639382e-004,right_val:0.5628787279129028,left_val:0.4421244859695435},{features:[[10,1,1,3,-1.],[10,2,1,1,3.]],threshold:-3.8876468897797167e-004,right_val:0.5391063094139099,left_val:0.4288370907306671},{features:[[1,2,4,18,-1.],[1,2,2,9,2.],[3,11,2,9,2.]],threshold:-0.0500488989055157,right_val:0.4703742861747742,left_val:0.6899513006210327},{features:[[12,4,4,12,-1.],[12,10,4,6,2.]],threshold:-0.0366354808211327,right_val:0.5191826224327087,left_val:0.2217779010534287},{features:[[0,0,1,6,-1.],[0,2,1,2,3.]],threshold:2.4273579474538565e-003,right_val:0.3497397899627686,left_val:0.5136224031448364},{features:[[9,11,2,3,-1.],[9,12,2,1,3.]],threshold:1.9558030180633068e-003,right_val:0.6408380866050720,left_val:0.4826192855834961},{features:[[8,7,4,3,-1.],[8,8,4,1,3.]],threshold:-1.7494610510766506e-003,right_val:0.5272685289382935,left_val:0.3922835886478424},{features:[[10,7,3,2,-1.],[11,7,1,2,3.]],threshold:0.0139550799503922,right_val:0.8416504859924316,left_val:0.5078201889991760},{features:[[7,7,3,2,-1.],[8,7,1,2,3.]],threshold:-2.1896739781368524e-004,right_val:0.4314234852790833,left_val:0.5520489811897278},{features:[[9,4,6,1,-1.],[11,4,2,1,3.]],threshold:-1.5131309628486633e-003,right_val:0.5382571220397949,left_val:0.3934605121612549},{features:[[8,7,2,3,-1.],[9,7,1,3,2.]],threshold:-4.3622800149023533e-003,right_val:0.4736475944519043,left_val:0.7370628714561462},{features:[[12,7,8,6,-1.],[16,7,4,3,2.],[12,10,4,3,2.]],threshold:0.0651605874300003,right_val:0.3281595110893250,left_val:0.5159279704093933},{features:[[0,7,8,6,-1.],[0,7,4,3,2.],[4,10,4,3,2.]],threshold:-2.3567399475723505e-003,right_val:0.5172886252403259,left_val:0.3672826886177063},{features:[[18,2,2,10,-1.],[19,2,1,5,2.],[18,7,1,5,2.]],threshold:0.0151466596871614,right_val:0.6687604188919067,left_val:0.5031493902206421},{features:[[0,2,6,4,-1.],[3,2,3,4,2.]],threshold:-0.0228509604930878,right_val:0.4709596931934357,left_val:0.6767519712448120},{features:[[9,4,6,1,-1.],[11,4,2,1,3.]],threshold:4.8867650330066681e-003,right_val:0.4059878885746002,left_val:0.5257998108863831},{features:[[7,15,2,2,-1.],[7,15,1,1,2.],[8,16,1,1,2.]],threshold:1.7619599821045995e-003,right_val:0.6688278913497925,left_val:0.4696272909641266},{features:[[11,13,1,6,-1.],[11,16,1,3,2.]],threshold:-1.2942519970238209e-003,right_val:0.5344281792640686,left_val:0.4320712983608246},{features:[[8,13,1,6,-1.],[8,16,1,3,2.]],threshold:0.0109299495816231,right_val:0.1637486070394516,left_val:0.4997706115245819},{features:[[14,3,2,1,-1.],[14,3,1,1,2.]],threshold:2.9958489903947338e-005,right_val:0.5633224248886108,left_val:0.4282417893409729},{features:[[8,15,2,3,-1.],[8,16,2,1,3.]],threshold:-6.5884361974895000e-003,right_val:0.4700526893138886,left_val:0.6772121191024780},{features:[[12,15,7,4,-1.],[12,17,7,2,2.]],threshold:3.2527779694646597e-003,right_val:0.4536148905754089,left_val:0.5313397049903870},{features:[[4,14,12,3,-1.],[4,15,12,1,3.]],threshold:-4.0435739792883396e-003,right_val:0.4413388967514038,left_val:0.5660061836242676},{features:[[10,3,3,2,-1.],[11,3,1,2,3.]],threshold:-1.2523540062829852e-003,right_val:0.5356451869010925,left_val:0.3731913864612579},{features:[[4,12,2,2,-1.],[4,13,2,1,2.]],threshold:1.9246719602961093e-004,right_val:0.3738811016082764,left_val:0.5189986228942871},{features:[[10,11,4,6,-1.],[10,14,4,3,2.]],threshold:-0.0385896712541580,right_val:0.5188810825347900,left_val:0.2956373989582062},{features:[[7,13,2,2,-1.],[7,13,1,1,2.],[8,14,1,1,2.]],threshold:1.5489870565943420e-004,right_val:0.5509533286094666,left_val:0.4347135126590729},{features:[[4,11,14,4,-1.],[11,11,7,2,2.],[4,13,7,2,2.]],threshold:-0.0337638482451439,right_val:0.5195475816726685,left_val:0.3230330049991608},{features:[[1,18,18,2,-1.],[7,18,6,2,3.]],threshold:-8.2657067105174065e-003,right_val:0.4552114009857178,left_val:0.5975489020347595},{features:[[11,18,2,2,-1.],[12,18,1,1,2.],[11,19,1,1,2.]],threshold:1.4481440302915871e-005,right_val:0.5497426986694336,left_val:0.4745678007602692},{features:[[7,18,2,2,-1.],[7,18,1,1,2.],[8,19,1,1,2.]],threshold:1.4951299817766994e-005,right_val:0.5480644106864929,left_val:0.4324473142623901},{features:[[12,18,8,2,-1.],[12,19,8,1,2.]],threshold:-0.0187417995184660,right_val:0.5178533196449280,left_val:0.1580052971839905},{features:[[7,14,6,2,-1.],[7,15,6,1,2.]],threshold:1.7572239739820361e-003,right_val:0.5773764252662659,left_val:0.4517636895179749},{features:[[8,12,4,8,-1.],[10,12,2,4,2.],[8,16,2,4,2.]],threshold:-3.1391119118779898e-003,right_val:0.5460842251777649,left_val:0.4149647951126099},{features:[[4,9,3,3,-1.],[4,10,3,1,3.]],threshold:6.6656779381446540e-005,right_val:0.5293084979057312,left_val:0.4039090871810913},{features:[[7,10,6,2,-1.],[9,10,2,2,3.]],threshold:6.7743421532213688e-003,right_val:0.6121956110000610,left_val:0.4767651855945587},{features:[[5,0,4,15,-1.],[7,0,2,15,2.]],threshold:-7.3868161998689175e-003,right_val:0.5187280774116516,left_val:0.3586258888244629},{features:[[8,6,12,14,-1.],[12,6,4,14,3.]],threshold:0.0140409301966429,right_val:0.5576155781745911,left_val:0.4712139964103699},{features:[[5,16,3,3,-1.],[5,17,3,1,3.]],threshold:-5.5258329957723618e-003,right_val:0.5039281249046326,left_val:0.2661027014255524},{features:[[8,1,12,19,-1.],[12,1,4,19,3.]],threshold:0.3868423998355866,right_val:0.2525899112224579,left_val:0.5144339799880981},{features:[[3,0,3,2,-1.],[3,1,3,1,2.]],threshold:1.1459240340627730e-004,right_val:0.5423371195793152,left_val:0.4284994900226593},{features:[[10,12,4,5,-1.],[10,12,2,5,2.]],threshold:-0.0184675697237253,right_val:0.5213062167167664,left_val:0.3885835111141205},{features:[[6,12,4,5,-1.],[8,12,2,5,2.]],threshold:-4.5907011372037232e-004,right_val:0.4235909879207611,left_val:0.5412563085556030},{features:[[11,11,2,2,-1.],[12,11,1,1,2.],[11,12,1,1,2.]],threshold:1.2527540093287826e-003,right_val:0.6624091267585754,left_val:0.4899305105209351},{features:[[0,2,3,6,-1.],[0,4,3,2,3.]],threshold:1.4910609461367130e-003,right_val:0.4040051996707916,left_val:0.5286778211593628},{features:[[11,11,2,2,-1.],[12,11,1,1,2.],[11,12,1,1,2.]],threshold:-7.5435562757775187e-004,right_val:0.4795120060443878,left_val:0.6032990217208862},{features:[[7,6,4,10,-1.],[7,11,4,5,2.]],threshold:-6.9478838704526424e-003,right_val:0.5373504161834717,left_val:0.4084401130676270},{features:[[11,11,2,2,-1.],[12,11,1,1,2.],[11,12,1,1,2.]],threshold:2.8092920547351241e-004,right_val:0.5759382247924805,left_val:0.4846062958240509},{features:[[2,13,5,2,-1.],[2,14,5,1,2.]],threshold:9.6073717577382922e-004,right_val:0.3554979860782623,left_val:0.5164741277694702},{features:[[11,11,2,2,-1.],[12,11,1,1,2.],[11,12,1,1,2.]],threshold:-2.6883929967880249e-004,right_val:0.4731765985488892,left_val:0.5677582025527954},{features:[[7,11,2,2,-1.],[7,11,1,1,2.],[8,12,1,1,2.]],threshold:2.1599370520561934e-003,right_val:0.7070567011833191,left_val:0.4731487035751343},{features:[[14,13,3,3,-1.],[14,14,3,1,3.]],threshold:5.6235301308333874e-003,right_val:0.2781791985034943,left_val:0.5240243077278137},{features:[[3,13,3,3,-1.],[3,14,3,1,3.]],threshold:-5.0243991427123547e-003,right_val:0.5062304139137268,left_val:0.2837013900279999},{features:[[9,14,2,3,-1.],[9,15,2,1,3.]],threshold:-9.7611639648675919e-003,right_val:0.4934569001197815,left_val:0.7400717735290527},{features:[[8,7,3,3,-1.],[8,8,3,1,3.]],threshold:4.1515100747346878e-003,right_val:0.3407008051872253,left_val:0.5119131207466126},{features:[[13,5,3,3,-1.],[13,6,3,1,3.]],threshold:6.2465080991387367e-003,right_val:0.6579058766365051,left_val:0.4923788011074066},{features:[[0,9,5,3,-1.],[0,10,5,1,3.]],threshold:-7.0597478188574314e-003,right_val:0.5032842159271240,left_val:0.2434711009263992},{features:[[13,5,3,3,-1.],[13,6,3,1,3.]],threshold:-2.0587709732353687e-003,right_val:0.4695087075233460,left_val:0.5900310873985291},{features:[[9,12,2,8,-1.],[9,12,1,4,2.],[10,16,1,4,2.]],threshold:-2.4146060459315777e-003,right_val:0.5189201831817627,left_val:0.3647317886352539},{features:[[11,7,2,2,-1.],[12,7,1,1,2.],[11,8,1,1,2.]],threshold:-1.4817609917372465e-003,right_val:0.4940128028392792,left_val:0.6034948229789734},{features:[[0,16,6,4,-1.],[3,16,3,4,2.]],threshold:-6.3016400672495365e-003,right_val:0.4560427963733673,left_val:0.5818989872932434},{features:[[10,6,2,3,-1.],[10,7,2,1,3.]],threshold:3.4763428848236799e-003,right_val:0.3483993113040924,left_val:0.5217475891113281},{features:[[9,5,2,6,-1.],[9,7,2,2,3.]],threshold:-0.0222508702427149,right_val:0.5032082796096802,left_val:0.2360700070858002},{features:[[12,15,8,4,-1.],[12,15,4,4,2.]],threshold:-0.0306125506758690,right_val:0.4914919137954712,left_val:0.6499186754226685},{features:[[0,14,8,6,-1.],[4,14,4,6,2.]],threshold:0.0130574796348810,right_val:0.5683764219284058,left_val:0.4413323104381561},{features:[[9,0,3,2,-1.],[10,0,1,2,3.]],threshold:-6.0095742810517550e-004,right_val:0.5333483219146729,left_val:0.4359731078147888},{features:[[4,15,4,2,-1.],[6,15,2,2,2.]],threshold:-4.1514250915497541e-004,right_val:0.4326060116291046,left_val:0.5504062771797180},{features:[[12,7,3,13,-1.],[13,7,1,13,3.]],threshold:-0.0137762902304530,right_val:0.5201548933982849,left_val:0.4064112901687622},{features:[[5,7,3,13,-1.],[6,7,1,13,3.]],threshold:-0.0322965085506439,right_val:0.4977194964885712,left_val:0.0473519712686539},{features:[[9,6,3,9,-1.],[9,9,3,3,3.]],threshold:0.0535569787025452,right_val:0.6666939258575440,left_val:0.4881733059883118},{features:[[4,4,7,12,-1.],[4,10,7,6,2.]],threshold:8.1889545544981956e-003,right_val:0.4240820109844208,left_val:0.5400037169456482},{features:[[12,12,2,2,-1.],[13,12,1,1,2.],[12,13,1,1,2.]],threshold:2.1055320394225419e-004,right_val:0.5563852787017822,left_val:0.4802047908306122},{features:[[6,12,2,2,-1.],[6,12,1,1,2.],[7,13,1,1,2.]],threshold:-2.4382730480283499e-003,right_val:0.4773685038089752,left_val:0.7387793064117432},{features:[[8,9,4,2,-1.],[10,9,2,1,2.],[8,10,2,1,2.]],threshold:3.2835570164024830e-003,right_val:0.3171291947364807,left_val:0.5288546085357666},{features:[[3,6,2,2,-1.],[3,6,1,1,2.],[4,7,1,1,2.]],threshold:2.3729570675641298e-003,right_val:0.7060170769691467,left_val:0.4750812947750092},{features:[[16,6,3,2,-1.],[16,7,3,1,2.]],threshold:-1.4541699783876538e-003,right_val:0.5330739021301270,left_val:0.3811730146408081}],threshold:79.2490768432617190},{simpleClassifiers:[{features:[[0,7,19,4,-1.],[0,9,19,2,2.]],threshold:0.0557552389800549,right_val:0.6806036829948425,left_val:0.4019156992435455},{features:[[10,2,10,1,-1.],[10,2,5,1,2.]],threshold:2.4730248842388391e-003,right_val:0.5965719819068909,left_val:0.3351148962974548},{features:[[9,4,2,12,-1.],[9,10,2,6,2.]],threshold:-3.5031698644161224e-004,right_val:0.3482286930084229,left_val:0.5557708144187927},{features:[[12,18,4,1,-1.],[12,18,2,1,2.]],threshold:5.4167630150914192e-004,right_val:0.5693380832672119,left_val:0.4260858893394470},{features:[[1,7,6,4,-1.],[1,7,3,2,2.],[4,9,3,2,2.]],threshold:7.7193678589537740e-004,right_val:0.5433688759803772,left_val:0.3494240045547485},{features:[[12,0,6,13,-1.],[14,0,2,13,3.]],threshold:-1.5999219613149762e-003,right_val:0.5484359264373779,left_val:0.4028499126434326},{features:[[2,0,6,13,-1.],[4,0,2,13,3.]],threshold:-1.1832080053864047e-004,right_val:0.5425465106964111,left_val:0.3806901872158051},{features:[[10,5,8,8,-1.],[10,9,8,4,2.]],threshold:3.2909031142480671e-004,right_val:0.5429521799087524,left_val:0.2620100080966950},{features:[[8,3,2,5,-1.],[9,3,1,5,2.]],threshold:2.9518108931370080e-004,right_val:0.5399264097213745,left_val:0.3799768984317780},{features:[[8,4,9,1,-1.],[11,4,3,1,3.]],threshold:9.0466710389591753e-005,right_val:0.5440226197242737,left_val:0.4433645009994507},{features:[[3,4,9,1,-1.],[6,4,3,1,3.]],threshold:1.5007190086180344e-005,right_val:0.5409119725227356,left_val:0.3719654977321625},{features:[[1,0,18,10,-1.],[7,0,6,10,3.]],threshold:0.1393561065196991,right_val:0.4479042887687683,left_val:0.5525395870208740},{features:[[7,17,5,3,-1.],[7,18,5,1,3.]],threshold:1.6461990308016539e-003,right_val:0.5772169828414917,left_val:0.4264501035213471},{features:[[7,11,6,1,-1.],[9,11,2,1,3.]],threshold:4.9984431825578213e-004,right_val:0.5685871243476868,left_val:0.4359526038169861},{features:[[2,2,3,2,-1.],[2,3,3,1,2.]],threshold:-1.0971280280500650e-003,right_val:0.5205408930778503,left_val:0.3390136957168579},{features:[[8,12,4,2,-1.],[8,13,4,1,2.]],threshold:6.6919892560690641e-004,right_val:0.5980659723281860,left_val:0.4557456076145172},{features:[[6,10,3,6,-1.],[6,13,3,3,2.]],threshold:8.6471042595803738e-004,right_val:0.2944033145904541,left_val:0.5134841203689575},{features:[[11,4,2,4,-1.],[11,4,1,4,2.]],threshold:-2.7182599296793342e-004,right_val:0.5377181172370911,left_val:0.3906578123569489},{features:[[7,4,2,4,-1.],[8,4,1,4,2.]],threshold:3.0249499104684219e-005,right_val:0.5225688815116882,left_val:0.3679609894752502},{features:[[9,6,2,4,-1.],[9,6,1,4,2.]],threshold:-8.5225896909832954e-003,right_val:0.4892365038394928,left_val:0.7293102145195007},{features:[[6,13,8,3,-1.],[6,14,8,1,3.]],threshold:1.6705560265108943e-003,right_val:0.5696138143539429,left_val:0.4345324933528900},{features:[[9,15,3,4,-1.],[10,15,1,4,3.]],threshold:-7.1433838456869125e-003,right_val:0.5225623846054077,left_val:0.2591280043125153},{features:[[9,2,2,17,-1.],[10,2,1,17,2.]],threshold:-0.0163193698972464,right_val:0.4651575982570648,left_val:0.6922279000282288},{features:[[7,0,6,1,-1.],[9,0,2,1,3.]],threshold:4.8034260980784893e-003,right_val:0.3286302983760834,left_val:0.5352262854576111},{features:[[8,15,3,4,-1.],[9,15,1,4,3.]],threshold:-7.5421929359436035e-003,right_val:0.5034546256065369,left_val:0.2040544003248215},{features:[[7,13,7,3,-1.],[7,14,7,1,3.]],threshold:-0.0143631100654602,right_val:0.4889059066772461,left_val:0.6804888844490051},{features:[[8,16,3,3,-1.],[9,16,1,3,3.]],threshold:8.9063588529825211e-004,right_val:0.3895480930805206,left_val:0.5310695767402649},{features:[[6,2,8,10,-1.],[6,7,8,5,2.]],threshold:-4.4060191139578819e-003,right_val:0.4372426867485046,left_val:0.5741562843322754},{features:[[2,5,8,8,-1.],[2,9,8,4,2.]],threshold:-1.8862540309783071e-004,right_val:0.5098205208778381,left_val:0.2831785976886749},{features:[[14,16,2,2,-1.],[14,17,2,1,2.]],threshold:-3.7979281041771173e-003,right_val:0.5246580243110657,left_val:0.3372507989406586},{features:[[4,16,2,2,-1.],[4,17,2,1,2.]],threshold:1.4627049677073956e-004,right_val:0.3911710083484650,left_val:0.5306674242019653},{features:[[10,11,4,6,-1.],[10,14,4,3,2.]],threshold:-4.9164638767251745e-005,right_val:0.3942720890045166,left_val:0.5462496280670166},{features:[[6,11,4,6,-1.],[6,14,4,3,2.]],threshold:-0.0335825011134148,right_val:0.5048211812973023,left_val:0.2157824039459229},{features:[[10,14,1,3,-1.],[10,15,1,1,3.]],threshold:-3.5339309833943844e-003,right_val:0.4872696995735169,left_val:0.6465312242507935},{features:[[8,14,4,3,-1.],[8,15,4,1,3.]],threshold:5.0144111737608910e-003,right_val:0.6248074769973755,left_val:0.4617668092250824},{features:[[10,0,4,6,-1.],[12,0,2,3,2.],[10,3,2,3,2.]],threshold:0.0188173707574606,right_val:0.2000052034854889,left_val:0.5220689177513123},{features:[[0,3,20,2,-1.],[0,4,20,1,2.]],threshold:-1.3434339780360460e-003,right_val:0.5301619768142700,left_val:0.4014537930488586},{features:[[12,0,8,2,-1.],[16,0,4,1,2.],[12,1,4,1,2.]],threshold:1.7557960236445069e-003,right_val:0.5653169751167297,left_val:0.4794039130210877},{features:[[2,12,10,8,-1.],[2,16,10,4,2.]],threshold:-0.0956374630331993,right_val:0.5006706714630127,left_val:0.2034195065498352},{features:[[17,7,2,10,-1.],[18,7,1,5,2.],[17,12,1,5,2.]],threshold:-0.0222412291914225,right_val:0.5046340227127075,left_val:0.7672473192214966},{features:[[1,7,2,10,-1.],[1,7,1,5,2.],[2,12,1,5,2.]],threshold:-0.0155758196488023,right_val:0.4755851030349731,left_val:0.7490342259407044},{features:[[15,10,3,6,-1.],[15,12,3,2,3.]],threshold:5.3599118255078793e-003,right_val:0.4004670977592468,left_val:0.5365303754806519},{features:[[4,4,6,2,-1.],[6,4,2,2,3.]],threshold:-0.0217634998261929,right_val:0.4964174926280975,left_val:0.0740154981613159},{features:[[0,5,20,6,-1.],[0,7,20,2,3.]],threshold:-0.1656159013509750,right_val:0.5218086242675781,left_val:0.2859103083610535},{features:[[0,0,8,2,-1.],[0,0,4,1,2.],[4,1,4,1,2.]],threshold:1.6461320046801120e-004,right_val:0.5380793213844299,left_val:0.4191615879535675},{features:[[1,0,18,4,-1.],[7,0,6,4,3.]],threshold:-8.9077502489089966e-003,right_val:0.4877404868602753,left_val:0.6273192763328552},{features:[[1,13,6,2,-1.],[1,14,6,1,2.]],threshold:8.6346449097618461e-004,right_val:0.3671025931835175,left_val:0.5159940719604492},{features:[[10,8,3,4,-1.],[11,8,1,4,3.]],threshold:-1.3751760125160217e-003,right_val:0.4579083919525147,left_val:0.5884376764297485},{features:[[6,1,6,1,-1.],[8,1,2,1,3.]],threshold:-1.4081239933148026e-003,right_val:0.5139945149421692,left_val:0.3560509979724884},{features:[[8,14,4,3,-1.],[8,15,4,1,3.]],threshold:-3.9342888630926609e-003,right_val:0.4664272069931030,left_val:0.5994288921356201},{features:[[1,6,18,2,-1.],[10,6,9,2,2.]],threshold:-0.0319669283926487,right_val:0.5144183039665222,left_val:0.3345462083816528},{features:[[15,11,1,2,-1.],[15,12,1,1,2.]],threshold:-1.5089280168467667e-005,right_val:0.4414057135581970,left_val:0.5582656264305115},{features:[[6,5,1,2,-1.],[6,6,1,1,2.]],threshold:5.1994470413774252e-004,right_val:0.6168993711471558,left_val:0.4623680114746094},{features:[[13,4,1,3,-1.],[13,5,1,1,3.]],threshold:-3.4220460802316666e-003,right_val:0.4974805116653442,left_val:0.6557074785232544},{features:[[2,15,1,2,-1.],[2,16,1,1,2.]],threshold:1.7723299970384687e-004,right_val:0.3901908099651337,left_val:0.5269501805305481},{features:[[12,4,4,3,-1.],[12,5,4,1,3.]],threshold:1.5716759953647852e-003,right_val:0.5790457725524902,left_val:0.4633373022079468},{features:[[0,0,7,3,-1.],[0,1,7,1,3.]],threshold:-8.9041329920291901e-003,right_val:0.5053591132164002,left_val:0.2689608037471771},{features:[[9,12,6,2,-1.],[9,12,3,2,2.]],threshold:4.0677518700249493e-004,right_val:0.4329898953437805,left_val:0.5456603169441223},{features:[[5,4,2,3,-1.],[5,5,2,1,3.]],threshold:6.7604780197143555e-003,right_val:0.6689761877059937,left_val:0.4648993909358978},{features:[[18,4,2,3,-1.],[18,5,2,1,3.]],threshold:2.9100088868290186e-003,right_val:0.3377839922904968,left_val:0.5309703946113586},{features:[[3,0,8,6,-1.],[3,2,8,2,3.]],threshold:1.3885459629818797e-003,right_val:0.5349133014678955,left_val:0.4074738919734955},{features:[[0,2,20,6,-1.],[10,2,10,3,2.],[0,5,10,3,2.]],threshold:-0.0767642632126808,right_val:0.5228242278099060,left_val:0.1992176026105881},{features:[[4,7,2,4,-1.],[5,7,1,4,2.]],threshold:-2.2688310127705336e-004,right_val:0.4253072142601013,left_val:0.5438501834869385},{features:[[3,10,15,2,-1.],[8,10,5,2,3.]],threshold:-6.3094152137637138e-003,right_val:0.5378909707069397,left_val:0.4259178936481476},{features:[[3,0,12,11,-1.],[9,0,6,11,2.]],threshold:-0.1100727990269661,right_val:0.4721749126911163,left_val:0.6904156804084778},{features:[[13,0,2,6,-1.],[13,0,1,6,2.]],threshold:2.8619659133255482e-004,right_val:0.5548306107521057,left_val:0.4524914920330048},{features:[[0,19,2,1,-1.],[1,19,1,1,2.]],threshold:2.9425329557852820e-005,right_val:0.4236463904380798,left_val:0.5370373725891113},{features:[[16,10,4,10,-1.],[18,10,2,5,2.],[16,15,2,5,2.]],threshold:-0.0248865708708763,right_val:0.4969303905963898,left_val:0.6423557996749878},{features:[[4,8,10,3,-1.],[4,9,10,1,3.]],threshold:0.0331488512456417,right_val:0.1613811999559403,left_val:0.4988475143909454},{features:[[14,12,3,3,-1.],[14,13,3,1,3.]],threshold:7.8491691965609789e-004,right_val:0.4223009049892426,left_val:0.5416026115417481},{features:[[0,10,4,10,-1.],[0,10,2,5,2.],[2,15,2,5,2.]],threshold:4.7087189741432667e-003,right_val:0.6027557849884033,left_val:0.4576328992843628},{features:[[18,3,2,6,-1.],[18,5,2,2,3.]],threshold:2.4144479539245367e-003,right_val:0.4422498941421509,left_val:0.5308973193168640},{features:[[6,6,1,3,-1.],[6,7,1,1,3.]],threshold:1.9523180089890957e-003,right_val:0.6663324832916260,left_val:0.4705634117126465},{features:[[7,7,7,2,-1.],[7,8,7,1,2.]],threshold:1.3031980488449335e-003,right_val:0.5526962280273438,left_val:0.4406126141548157},{features:[[0,3,2,6,-1.],[0,5,2,2,3.]],threshold:4.4735497795045376e-003,right_val:0.3301498889923096,left_val:0.5129023790359497},{features:[[11,1,3,1,-1.],[12,1,1,1,3.]],threshold:-2.6652868837118149e-003,right_val:0.5175036191940308,left_val:0.3135471045970917},{features:[[5,0,2,6,-1.],[6,0,1,6,2.]],threshold:1.3666770246345550e-004,right_val:0.5306876897811890,left_val:0.4119370877742767},{features:[[1,1,18,14,-1.],[7,1,6,14,3.]],threshold:-0.0171264503151178,right_val:0.4836578965187073,left_val:0.6177806258201599},{features:[[4,6,8,3,-1.],[8,6,4,3,2.]],threshold:-2.6601430727168918e-004,right_val:0.5169736742973328,left_val:0.3654330968856812},{features:[[9,12,6,2,-1.],[9,12,3,2,2.]],threshold:-0.0229323804378510,right_val:0.5163992047309876,left_val:0.3490915000438690},{features:[[5,12,6,2,-1.],[8,12,3,2,2.]],threshold:2.3316550068557262e-003,right_val:0.3709389865398407,left_val:0.5166299939155579},{features:[[10,7,3,5,-1.],[11,7,1,5,3.]],threshold:0.0169256608933210,right_val:0.8053988218307495,left_val:0.5014736056327820},{features:[[7,7,3,5,-1.],[8,7,1,5,3.]],threshold:-8.9858826249837875e-003,right_val:0.4657020866870880,left_val:0.6470788717269898},{features:[[13,0,3,10,-1.],[14,0,1,10,3.]],threshold:-0.0118746999651194,right_val:0.5258755087852478,left_val:0.3246378898620606},{features:[[4,11,3,2,-1.],[4,12,3,1,2.]],threshold:1.9350569345988333e-004,right_val:0.3839643895626068,left_val:0.5191941857337952},{features:[[17,3,3,6,-1.],[18,3,1,6,3.]],threshold:5.8713490143418312e-003,right_val:0.6187043190002441,left_val:0.4918133914470673},{features:[[1,8,18,10,-1.],[1,13,18,5,2.]],threshold:-0.2483879029750824,right_val:0.4988150000572205,left_val:0.1836802959442139},{features:[[13,0,3,10,-1.],[14,0,1,10,3.]],threshold:0.0122560001909733,right_val:0.3632029891014099,left_val:0.5227053761482239},{features:[[9,14,2,3,-1.],[9,15,2,1,3.]],threshold:8.3990179700776935e-004,right_val:0.5774148106575012,left_val:0.4490250051021576},{features:[[16,3,3,7,-1.],[17,3,1,7,3.]],threshold:2.5407369248569012e-003,right_val:0.5858299136161804,left_val:0.4804787039756775},{features:[[4,0,3,10,-1.],[5,0,1,10,3.]],threshold:-0.0148224299773574,right_val:0.5023537278175354,left_val:0.2521049976348877},{features:[[16,3,3,7,-1.],[17,3,1,7,3.]],threshold:-5.7973959483206272e-003,right_val:0.4853715002536774,left_val:0.5996695756912231},{features:[[0,9,1,2,-1.],[0,10,1,1,2.]],threshold:7.2662148158997297e-004,right_val:0.3671779930591583,left_val:0.5153716802597046},{features:[[18,1,2,10,-1.],[18,1,1,10,2.]],threshold:-0.0172325801104307,right_val:0.4994656145572662,left_val:0.6621719002723694},{features:[[0,1,2,10,-1.],[1,1,1,10,2.]],threshold:7.8624086454510689e-003,right_val:0.6256101727485657,left_val:0.4633395075798035},{features:[[10,16,3,4,-1.],[11,16,1,4,3.]],threshold:-4.7343620099127293e-003,right_val:0.5281885266304016,left_val:0.3615573048591614},{features:[[2,8,3,3,-1.],[3,8,1,3,3.]],threshold:8.3048478700220585e-004,right_val:0.5550957918167114,left_val:0.4442889094352722},{features:[[11,0,2,6,-1.],[12,0,1,3,2.],[11,3,1,3,2.]],threshold:7.6602199114859104e-003,right_val:0.2613354921340942,left_val:0.5162935256958008},{features:[[7,0,2,6,-1.],[7,0,1,3,2.],[8,3,1,3,2.]],threshold:-4.1048377752304077e-003,right_val:0.5019031763076782,left_val:0.2789632081985474},{features:[[16,3,3,7,-1.],[17,3,1,7,3.]],threshold:4.8512578941881657e-003,right_val:0.5661668181419373,left_val:0.4968984127044678},{features:[[1,3,3,7,-1.],[2,3,1,7,3.]],threshold:9.9896453320980072e-004,right_val:0.5551813244819641,left_val:0.4445607960224152},{features:[[14,1,6,16,-1.],[16,1,2,16,3.]],threshold:-0.2702363133430481,right_val:0.5151314139366150,left_val:0.0293882098048925},{features:[[0,1,6,16,-1.],[2,1,2,16,3.]],threshold:-0.0130906803533435,right_val:0.4447459876537323,left_val:0.5699399709701538},{features:[[2,0,16,8,-1.],[10,0,8,4,2.],[2,4,8,4,2.]],threshold:-9.4342790544033051e-003,right_val:0.5487895011901856,left_val:0.4305466115474701},{features:[[6,8,5,3,-1.],[6,9,5,1,3.]],threshold:-1.5482039889320731e-003,right_val:0.5128080844879150,left_val:0.3680317103862763},{features:[[9,7,3,3,-1.],[10,7,1,3,3.]],threshold:5.3746132180094719e-003,right_val:0.6101555824279785,left_val:0.4838916957378388},{features:[[8,8,4,3,-1.],[8,9,4,1,3.]],threshold:1.5786769799888134e-003,right_val:0.4118548035621643,left_val:0.5325223207473755},{features:[[9,6,2,4,-1.],[9,6,1,4,2.]],threshold:3.6856050137430429e-003,right_val:0.6252303123474121,left_val:0.4810948073863983},{features:[[0,7,15,1,-1.],[5,7,5,1,3.]],threshold:9.3887019902467728e-003,right_val:0.3629410862922669,left_val:0.5200229883193970},{features:[[8,2,7,9,-1.],[8,5,7,3,3.]],threshold:0.0127926301211119,right_val:0.6738016009330750,left_val:0.4961709976196289},{features:[[1,7,16,4,-1.],[1,7,8,2,2.],[9,9,8,2,2.]],threshold:-3.3661040943115950e-003,right_val:0.5283598899841309,left_val:0.4060279130935669},{features:[[6,12,8,2,-1.],[6,13,8,1,2.]],threshold:3.9771420415490866e-004,right_val:0.5900775194168091,left_val:0.4674113988876343},{features:[[8,11,3,3,-1.],[8,12,3,1,3.]],threshold:1.4868030557408929e-003,right_val:0.6082053780555725,left_val:0.4519116878509522},{features:[[4,5,14,10,-1.],[11,5,7,5,2.],[4,10,7,5,2.]],threshold:-0.0886867493391037,right_val:0.5180991888046265,left_val:0.2807899117469788},{features:[[4,12,3,2,-1.],[4,13,3,1,2.]],threshold:-7.4296112870797515e-005,right_val:0.4087625145912170,left_val:0.5295584201812744},{features:[[9,11,6,1,-1.],[11,11,2,1,3.]],threshold:-1.4932939848222304e-005,right_val:0.4538542926311493,left_val:0.5461400151252747},{features:[[4,9,7,6,-1.],[4,11,7,2,3.]],threshold:5.9162238612771034e-003,right_val:0.4192134141921997,left_val:0.5329161286354065},{features:[[7,10,6,3,-1.],[7,11,6,1,3.]],threshold:1.1141640134155750e-003,right_val:0.5706217288970947,left_val:0.4512017965316773},{features:[[9,11,2,2,-1.],[9,12,2,1,2.]],threshold:8.9249362645205110e-005,right_val:0.5897638201713562,left_val:0.4577805995941162},{features:[[0,5,20,6,-1.],[0,7,20,2,3.]],threshold:2.5319510605186224e-003,right_val:0.3357639014720917,left_val:0.5299603939056397},{features:[[6,4,6,1,-1.],[8,4,2,1,3.]],threshold:0.0124262003228068,right_val:0.1346601992845535,left_val:0.4959059059619904},{features:[[9,11,6,1,-1.],[11,11,2,1,3.]],threshold:0.0283357501029968,right_val:6.1043637106195092e-004,left_val:0.5117079019546509},{features:[[5,11,6,1,-1.],[7,11,2,1,3.]],threshold:6.6165882162749767e-003,right_val:0.7011628150939941,left_val:0.4736349880695343},{features:[[10,16,3,4,-1.],[11,16,1,4,3.]],threshold:8.0468766391277313e-003,right_val:0.3282819986343384,left_val:0.5216417908668518},{features:[[8,7,3,3,-1.],[9,7,1,3,3.]],threshold:-1.1193980462849140e-003,right_val:0.4563739001750946,left_val:0.5809860825538635},{features:[[2,12,16,8,-1.],[2,16,16,4,2.]],threshold:0.0132775902748108,right_val:0.4103901088237763,left_val:0.5398362278938294},{features:[[0,15,15,2,-1.],[0,16,15,1,2.]],threshold:4.8794739996083081e-004,right_val:0.5410590767860413,left_val:0.4249286055564880},{features:[[15,4,5,6,-1.],[15,6,5,2,3.]],threshold:0.0112431701272726,right_val:0.3438215851783752,left_val:0.5269963741302490},{features:[[9,5,2,4,-1.],[10,5,1,4,2.]],threshold:-8.9896668214350939e-004,right_val:0.4456613063812256,left_val:0.5633075833320618},{features:[[8,10,9,6,-1.],[8,12,9,2,3.]],threshold:6.6677159629762173e-003,right_val:0.4362679123878479,left_val:0.5312889218330383},{features:[[2,19,15,1,-1.],[7,19,5,1,3.]],threshold:0.0289472993463278,right_val:0.6575797796249390,left_val:0.4701794981956482},{features:[[10,16,3,4,-1.],[11,16,1,4,3.]],threshold:-0.0234000496566296,right_val:0.5137398838996887,left_val:0.},{features:[[0,15,20,4,-1.],[0,17,20,2,2.]],threshold:-0.0891170501708984,right_val:0.4942430853843689,left_val:0.0237452797591686},{features:[[10,16,3,4,-1.],[11,16,1,4,3.]],threshold:-0.0140546001493931,right_val:0.5117511153221130,left_val:0.3127323091030121},{features:[[7,16,3,4,-1.],[8,16,1,4,3.]],threshold:8.1239398568868637e-003,right_val:0.2520025968551636,left_val:0.5009049177169800},{features:[[9,16,3,3,-1.],[9,17,3,1,3.]],threshold:-4.9964650534093380e-003,right_val:0.4927811920642853,left_val:0.6387143731117249},{features:[[8,11,4,6,-1.],[8,14,4,3,2.]],threshold:3.1253970228135586e-003,right_val:0.3680452108383179,left_val:0.5136849880218506},{features:[[9,6,2,12,-1.],[9,10,2,4,3.]],threshold:6.7669642157852650e-003,right_val:0.4363631904125214,left_val:0.5509843826293945},{features:[[8,17,4,3,-1.],[8,18,4,1,3.]],threshold:-2.3711440153419971e-003,right_val:0.4586946964263916,left_val:0.6162335276603699},{features:[[9,18,8,2,-1.],[13,18,4,1,2.],[9,19,4,1,2.]],threshold:-5.3522791713476181e-003,right_val:0.4920490980148315,left_val:0.6185457706451416},{features:[[1,18,8,2,-1.],[1,19,8,1,2.]],threshold:-0.0159688591957092,right_val:0.4983252882957459,left_val:0.1382617950439453},{features:[[13,5,6,15,-1.],[15,5,2,15,3.]],threshold:4.7676060348749161e-003,right_val:0.5490046143531799,left_val:0.4688057899475098},{features:[[9,8,2,2,-1.],[9,9,2,1,2.]],threshold:-2.4714691098779440e-003,right_val:0.5003952980041504,left_val:0.2368514984846115},{features:[[9,5,2,3,-1.],[9,5,1,3,2.]],threshold:-7.1033788844943047e-004,right_val:0.4721533060073853,left_val:0.5856394171714783},{features:[[1,5,6,15,-1.],[3,5,2,15,3.]],threshold:-0.1411755979061127,right_val:0.4961591064929962,left_val:0.0869000628590584},{features:[[4,1,14,8,-1.],[11,1,7,4,2.],[4,5,7,4,2.]],threshold:0.1065180972218514,right_val:0.1741005033254623,left_val:0.5138837099075317},{features:[[2,4,4,16,-1.],[2,4,2,8,2.],[4,12,2,8,2.]],threshold:-0.0527447499334812,right_val:0.4772881865501404,left_val:0.7353636026382446},{features:[[12,4,3,12,-1.],[12,10,3,6,2.]],threshold:-4.7431760467588902e-003,right_val:0.5292701721191406,left_val:0.3884406089782715},{features:[[4,5,10,12,-1.],[4,5,5,6,2.],[9,11,5,6,2.]],threshold:9.9676765967160463e-004,right_val:0.4003424048423767,left_val:0.5223492980003357},{features:[[9,14,2,3,-1.],[9,15,2,1,3.]],threshold:8.0284131690859795e-003,right_val:0.7212964296340942,left_val:0.4959106147289276},{features:[[5,4,2,3,-1.],[5,5,2,1,3.]],threshold:8.6025858763605356e-004,right_val:0.5538476109504700,left_val:0.4444884061813355},{features:[[12,2,4,10,-1.],[14,2,2,5,2.],[12,7,2,5,2.]],threshold:9.3191501218825579e-004,right_val:0.4163244068622589,left_val:0.5398371219635010},{features:[[6,4,7,3,-1.],[6,5,7,1,3.]],threshold:-2.5082060601562262e-003,right_val:0.4562500119209290,left_val:0.5854265093803406},{features:[[2,0,18,2,-1.],[11,0,9,1,2.],[2,1,9,1,2.]],threshold:-2.1378761157393456e-003,right_val:0.5280259251594544,left_val:0.4608069062232971},{features:[[0,0,18,2,-1.],[0,0,9,1,2.],[9,1,9,1,2.]],threshold:-2.1546049974858761e-003,right_val:0.5255997180938721,left_val:0.3791126906871796},{features:[[13,13,4,6,-1.],[15,13,2,3,2.],[13,16,2,3,2.]],threshold:-7.6214009895920753e-003,right_val:0.4952073991298676,left_val:0.5998609066009522},{features:[[3,13,4,6,-1.],[3,13,2,3,2.],[5,16,2,3,2.]],threshold:2.2055360022932291e-003,right_val:0.5588530898094177,left_val:0.4484206140041351},{features:[[10,12,2,6,-1.],[10,15,2,3,2.]],threshold:1.2586950324475765e-003,right_val:0.4423840939998627,left_val:0.5450747013092041},{features:[[5,9,10,10,-1.],[5,9,5,5,2.],[10,14,5,5,2.]],threshold:-5.0926720723509789e-003,right_val:0.5263035893440247,left_val:0.4118275046348572},{features:[[11,4,4,2,-1.],[13,4,2,1,2.],[11,5,2,1,2.]],threshold:-2.5095739401876926e-003,right_val:0.4998494982719421,left_val:0.5787907838821411},{features:[[7,12,6,8,-1.],[10,12,3,8,2.]],threshold:-0.0773275569081306,right_val:0.4811120033264160,left_val:0.8397865891456604},{features:[[12,2,4,10,-1.],[14,2,2,5,2.],[12,7,2,5,2.]],threshold:-0.0414858199656010,right_val:0.5176993012428284,left_val:0.2408611029386520},{features:[[8,11,2,1,-1.],[9,11,1,1,2.]],threshold:1.0355669655837119e-004,right_val:0.5417054295539856,left_val:0.4355360865592957},{features:[[10,5,1,12,-1.],[10,9,1,4,3.]],threshold:1.3255809899419546e-003,right_val:0.4894095063209534,left_val:0.5453971028327942},{features:[[0,11,6,9,-1.],[3,11,3,9,2.]],threshold:-8.0598732456564903e-003,right_val:0.4577918946743012,left_val:0.5771024227142334},{features:[[12,2,4,10,-1.],[14,2,2,5,2.],[12,7,2,5,2.]],threshold:0.0190586205571890,right_val:0.3400475084781647,left_val:0.5169867873191834},{features:[[4,2,4,10,-1.],[4,2,2,5,2.],[6,7,2,5,2.]],threshold:-0.0350578911602497,right_val:0.5000503063201904,left_val:0.2203243970870972},{features:[[11,4,4,2,-1.],[13,4,2,1,2.],[11,5,2,1,2.]],threshold:5.7296059094369411e-003,right_val:0.6597570776939392,left_val:0.5043408274650574},{features:[[0,14,6,3,-1.],[0,15,6,1,3.]],threshold:-0.0116483299061656,right_val:0.4996652901172638,left_val:0.2186284959316254},{features:[[11,4,4,2,-1.],[13,4,2,1,2.],[11,5,2,1,2.]],threshold:1.4544479781761765e-003,right_val:0.5503727793693543,left_val:0.5007681846618652},{features:[[6,1,3,2,-1.],[7,1,1,2,3.]],threshold:-2.5030909455381334e-004,right_val:0.5241670012474060,left_val:0.4129841029644013},{features:[[11,4,4,2,-1.],[13,4,2,1,2.],[11,5,2,1,2.]],threshold:-8.2907272735610604e-004,right_val:0.4974496066570282,left_val:0.5412868261337280},{features:[[5,4,4,2,-1.],[5,4,2,1,2.],[7,5,2,1,2.]],threshold:1.0862209601327777e-003,right_val:0.5879228711128235,left_val:0.4605529904365540},{features:[[13,0,2,12,-1.],[14,0,1,6,2.],[13,6,1,6,2.]],threshold:2.0000500080641359e-004,right_val:0.4705209136009216,left_val:0.5278854966163635},{features:[[6,0,3,10,-1.],[7,0,1,10,3.]],threshold:2.9212920926511288e-003,right_val:0.3755536973476410,left_val:0.5129609704017639},{features:[[3,0,17,8,-1.],[3,4,17,4,2.]],threshold:0.0253874007612467,right_val:0.5790768265724182,left_val:0.4822691977024078},{features:[[0,4,20,4,-1.],[0,6,20,2,2.]],threshold:-3.1968469265848398e-003,right_val:0.3962840139865875,left_val:0.5248395204544067}],threshold:87.6960296630859380},{simpleClassifiers:[{features:[[0,3,8,2,-1.],[4,3,4,2,2.]],threshold:5.8031738735735416e-003,right_val:0.5961983203887940,left_val:0.3498983979225159},{features:[[8,11,4,3,-1.],[8,12,4,1,3.]],threshold:-9.0003069490194321e-003,right_val:0.4478552043437958,left_val:0.6816636919975281},{features:[[5,7,6,4,-1.],[5,7,3,2,2.],[8,9,3,2,2.]],threshold:-1.1549659539014101e-003,right_val:0.3578251004219055,left_val:0.5585706233978272},{features:[[8,3,4,9,-1.],[8,6,4,3,3.]],threshold:-1.1069850297644734e-003,right_val:0.3050428032875061,left_val:0.5365036129951477},{features:[[8,15,1,4,-1.],[8,17,1,2,2.]],threshold:1.0308309720130637e-004,right_val:0.5344635844230652,left_val:0.3639095127582550},{features:[[4,5,12,7,-1.],[8,5,4,7,3.]],threshold:-5.0984839908778667e-003,right_val:0.5504264831542969,left_val:0.2859157025814056},{features:[[4,2,4,10,-1.],[4,2,2,5,2.],[6,7,2,5,2.]],threshold:8.2572200335562229e-004,right_val:0.3476041853427887,left_val:0.5236523747444153},{features:[[3,0,17,2,-1.],[3,1,17,1,2.]],threshold:9.9783325567841530e-003,right_val:0.6219646930694580,left_val:0.4750322103500366},{features:[[2,2,16,15,-1.],[2,7,16,5,3.]],threshold:-0.0374025292694569,right_val:0.5278062820434570,left_val:0.3343375921249390},{features:[[15,2,5,2,-1.],[15,3,5,1,2.]],threshold:4.8548257909715176e-003,right_val:0.3700444102287293,left_val:0.5192180871963501},{features:[[9,3,2,2,-1.],[10,3,1,2,2.]],threshold:-1.8664470408111811e-003,right_val:0.5091944932937622,left_val:0.2929843962192535},{features:[[4,5,16,15,-1.],[4,10,16,5,3.]],threshold:0.0168888904154301,right_val:0.5431225895881653,left_val:0.3686845898628235},{features:[[7,13,5,6,-1.],[7,16,5,3,2.]],threshold:-5.8372621424496174e-003,right_val:0.5221335887908936,left_val:0.3632183969020844},{features:[[10,7,3,2,-1.],[11,7,1,2,3.]],threshold:-1.4713739510625601e-003,right_val:0.4700650870800018,left_val:0.5870683789253235},{features:[[8,3,3,1,-1.],[9,3,1,1,3.]],threshold:-1.1522950371727347e-003,right_val:0.5140954256057739,left_val:0.3195894956588745},{features:[[9,16,3,3,-1.],[9,17,3,1,3.]],threshold:-4.2560300789773464e-003,right_val:0.4814921021461487,left_val:0.6301859021186829},{features:[[0,2,5,2,-1.],[0,3,5,1,2.]],threshold:-6.7378291860222816e-003,right_val:0.5025808215141296,left_val:0.1977048069238663},{features:[[12,5,4,3,-1.],[12,6,4,1,3.]],threshold:0.0113826701417565,right_val:0.6867045760154724,left_val:0.4954132139682770},{features:[[1,7,12,1,-1.],[5,7,4,1,3.]],threshold:5.1794708706438541e-003,right_val:0.3350647985935211,left_val:0.5164427757263184},{features:[[7,5,6,14,-1.],[7,12,6,7,2.]],threshold:-0.1174378991127014,right_val:0.5234413743019104,left_val:0.2315246015787125},{features:[[0,0,8,10,-1.],[0,0,4,5,2.],[4,5,4,5,2.]],threshold:0.0287034492939711,right_val:0.6722521185874939,left_val:0.4664297103881836},{features:[[9,1,3,2,-1.],[10,1,1,2,3.]],threshold:4.8231030814349651e-003,right_val:0.2723532915115356,left_val:0.5220875144004822},{features:[[8,1,3,2,-1.],[9,1,1,2,3.]],threshold:2.6798530016094446e-003,right_val:0.2906948924064636,left_val:0.5079277157783508},{features:[[12,4,3,3,-1.],[12,5,3,1,3.]],threshold:8.0504082143306732e-003,right_val:0.6395021080970764,left_val:0.4885950982570648},{features:[[7,4,6,16,-1.],[7,12,6,8,2.]],threshold:4.8054959625005722e-003,right_val:0.3656663894653320,left_val:0.5197256803512573},{features:[[12,4,3,3,-1.],[12,5,3,1,3.]],threshold:-2.2420159075409174e-003,right_val:0.4763701856136322,left_val:0.6153467893600464},{features:[[2,3,2,6,-1.],[2,5,2,2,3.]],threshold:-0.0137577103450894,right_val:0.5030903220176697,left_val:0.2637344896793366},{features:[[14,2,6,9,-1.],[14,5,6,3,3.]],threshold:-0.1033829972147942,right_val:0.5182461142539978,left_val:0.2287521958351135},{features:[[5,4,3,3,-1.],[5,5,3,1,3.]],threshold:-9.4432085752487183e-003,right_val:0.4694949090480804,left_val:0.6953303813934326},{features:[[9,17,3,2,-1.],[10,17,1,2,3.]],threshold:8.0271181650459766e-004,right_val:0.4268783926963806,left_val:0.5450655221939087},{features:[[5,5,2,3,-1.],[5,6,2,1,3.]],threshold:-4.1945669800043106e-003,right_val:0.4571642875671387,left_val:0.6091387867927551},{features:[[13,11,3,6,-1.],[13,13,3,2,3.]],threshold:0.0109422104433179,right_val:0.3284547030925751,left_val:0.5241063237190247},{features:[[3,14,2,6,-1.],[3,17,2,3,2.]],threshold:-5.7841069065034389e-004,right_val:0.4179368913173676,left_val:0.5387929081916809},{features:[[14,3,6,2,-1.],[14,4,6,1,2.]],threshold:-2.0888620056211948e-003,right_val:0.5301715731620789,left_val:0.4292691051959992},{features:[[0,8,16,2,-1.],[0,9,16,1,2.]],threshold:3.2383969519287348e-003,right_val:0.5220744013786316,left_val:0.3792347908020020},{features:[[14,3,6,2,-1.],[14,4,6,1,2.]],threshold:4.9075027927756310e-003,right_val:0.4126757979393005,left_val:0.5237283110618591},{features:[[0,0,5,6,-1.],[0,2,5,2,3.]],threshold:-0.0322779417037964,right_val:0.4994502067565918,left_val:0.1947655975818634},{features:[[12,5,4,3,-1.],[12,6,4,1,3.]],threshold:-8.9711230248212814e-003,right_val:0.4929032027721405,left_val:0.6011285185813904},{features:[[4,11,3,6,-1.],[4,13,3,2,3.]],threshold:0.0153210898861289,right_val:0.2039822041988373,left_val:0.5009753704071045},{features:[[12,5,4,3,-1.],[12,6,4,1,3.]],threshold:2.0855569746345282e-003,right_val:0.5721694827079773,left_val:0.4862189888954163},{features:[[9,5,1,3,-1.],[9,6,1,1,3.]],threshold:5.0615021027624607e-003,right_val:0.1801805943250656,left_val:0.5000218749046326},{features:[[12,5,4,3,-1.],[12,6,4,1,3.]],threshold:-3.7174751050770283e-003,right_val:0.4897592961788178,left_val:0.5530117154121399},{features:[[6,6,8,12,-1.],[6,12,8,6,2.]],threshold:-0.0121705001220107,right_val:0.5383723974227905,left_val:0.4178605973720551},{features:[[12,5,4,3,-1.],[12,6,4,1,3.]],threshold:4.6248398721218109e-003,right_val:0.5761327147483826,left_val:0.4997169971466065},{features:[[5,12,9,2,-1.],[8,12,3,2,3.]],threshold:-2.1040429419372231e-004,right_val:0.4097681045532227,left_val:0.5331807136535645},{features:[[12,5,4,3,-1.],[12,6,4,1,3.]],threshold:-0.0146417804062366,right_val:0.5051776170730591,left_val:0.5755925178527832},{features:[[4,5,4,3,-1.],[4,6,4,1,3.]],threshold:3.3199489116668701e-003,right_val:0.6031805872917175,left_val:0.4576976895332336},{features:[[6,6,9,2,-1.],[9,6,3,2,3.]],threshold:3.7236879579722881e-003,right_val:0.5415883064270020,left_val:0.4380396902561188},{features:[[4,11,1,3,-1.],[4,12,1,1,3.]],threshold:8.2951161311939359e-004,right_val:0.3702219128608704,left_val:0.5163031816482544},{features:[[14,12,6,6,-1.],[14,12,3,6,2.]],threshold:-0.0114084901288152,right_val:0.4862565100193024,left_val:0.6072946786880493},{features:[[7,0,3,7,-1.],[8,0,1,7,3.]],threshold:-4.5320121571421623e-003,right_val:0.5088962912559509,left_val:0.3292475938796997},{features:[[9,8,3,3,-1.],[10,8,1,3,3.]],threshold:5.1276017911732197e-003,right_val:0.6122708916664124,left_val:0.4829767942428589},{features:[[8,8,3,3,-1.],[9,8,1,3,3.]],threshold:9.8583158105611801e-003,right_val:0.6556177139282227,left_val:0.4660679996013641},{features:[[5,10,11,3,-1.],[5,11,11,1,3.]],threshold:0.0369859188795090,right_val:0.1690472066402435,left_val:0.5204849243164063},{features:[[5,7,10,1,-1.],[10,7,5,1,2.]],threshold:4.6491161920130253e-003,right_val:0.3725225031375885,left_val:0.5167322158813477},{features:[[9,7,3,2,-1.],[10,7,1,2,3.]],threshold:-4.2664702050387859e-003,right_val:0.4987342953681946,left_val:0.6406493186950684},{features:[[8,7,3,2,-1.],[9,7,1,2,3.]],threshold:-4.7956590424291790e-004,right_val:0.4464873969554901,left_val:0.5897293090820313},{features:[[11,9,4,2,-1.],[11,9,2,2,2.]],threshold:3.6827160511165857e-003,right_val:0.3472662866115570,left_val:0.5441560745239258},{features:[[5,9,4,2,-1.],[7,9,2,2,2.]],threshold:-0.0100598800927401,right_val:0.5004829764366150,left_val:0.2143162935972214},{features:[[14,10,2,4,-1.],[14,12,2,2,2.]],threshold:-3.0361840617842972e-004,right_val:0.4590323865413666,left_val:0.5386424064636231},{features:[[7,7,3,2,-1.],[8,7,1,2,3.]],threshold:-1.4545479789376259e-003,right_val:0.4497095048427582,left_val:0.5751184225082398},{features:[[14,17,6,3,-1.],[14,18,6,1,3.]],threshold:1.6515209572389722e-003,right_val:0.4238520860671997,left_val:0.5421937704086304},{features:[[4,5,12,12,-1.],[4,5,6,6,2.],[10,11,6,6,2.]],threshold:-7.8468639403581619e-003,right_val:0.5258157253265381,left_val:0.4077920913696289},{features:[[6,9,8,8,-1.],[10,9,4,4,2.],[6,13,4,4,2.]],threshold:-5.1259850151836872e-003,right_val:0.5479453206062317,left_val:0.4229275882244110},{features:[[0,4,15,4,-1.],[5,4,5,4,3.]],threshold:-0.0368909612298012,right_val:0.4674678146839142,left_val:0.6596375703811646},{features:[[13,2,4,1,-1.],[13,2,2,1,2.]],threshold:2.4035639944486320e-004,right_val:0.5573202967643738,left_val:0.4251135885715485},{features:[[4,12,2,2,-1.],[4,13,2,1,2.]],threshold:-1.5150169929256663e-005,right_val:0.4074114859104157,left_val:0.5259246826171875},{features:[[8,13,4,3,-1.],[8,14,4,1,3.]],threshold:2.2108471021056175e-003,right_val:0.5886352062225342,left_val:0.4671722948551178},{features:[[9,13,2,3,-1.],[9,14,2,1,3.]],threshold:-1.1568620102480054e-003,right_val:0.4487161934375763,left_val:0.5711066126823425},{features:[[13,11,2,3,-1.],[13,12,2,1,3.]],threshold:4.9996292218565941e-003,right_val:0.2898327112197876,left_val:0.5264198184013367},{features:[[7,12,4,4,-1.],[7,12,2,2,2.],[9,14,2,2,2.]],threshold:-1.4656189596280456e-003,right_val:0.5197871923446655,left_val:0.3891738057136536},{features:[[10,11,2,2,-1.],[11,11,1,1,2.],[10,12,1,1,2.]],threshold:-1.1975039960816503e-003,right_val:0.4927955865859985,left_val:0.5795872807502747},{features:[[8,17,3,2,-1.],[9,17,1,2,3.]],threshold:-4.4954330660402775e-003,right_val:0.5012555122375488,left_val:0.2377603054046631},{features:[[10,11,2,2,-1.],[11,11,1,1,2.],[10,12,1,1,2.]],threshold:1.4997160178609192e-004,right_val:0.5617607831954956,left_val:0.4876626133918762},{features:[[0,17,6,3,-1.],[0,18,6,1,3.]],threshold:2.6391509454697371e-003,right_val:0.3765509128570557,left_val:0.5168088078498840},{features:[[10,11,2,2,-1.],[11,11,1,1,2.],[10,12,1,1,2.]],threshold:-2.9368131072260439e-004,right_val:0.4874630868434906,left_val:0.5446649193763733},{features:[[8,11,2,2,-1.],[8,11,1,1,2.],[9,12,1,1,2.]],threshold:1.4211760135367513e-003,right_val:0.6691331863403320,left_val:0.4687897861003876},{features:[[12,5,8,4,-1.],[12,5,4,4,2.]],threshold:0.0794276371598244,right_val:0.2732945978641510,left_val:0.5193443894386292},{features:[[0,5,8,4,-1.],[4,5,4,4,2.]],threshold:0.0799375027418137,right_val:0.1782083958387375,left_val:0.4971731007099152},{features:[[13,2,4,1,-1.],[13,2,2,1,2.]],threshold:0.0110892597585917,right_val:0.3209475874900818,left_val:0.5165994763374329},{features:[[3,2,4,1,-1.],[5,2,2,1,2.]],threshold:1.6560709627810866e-004,right_val:0.5307276248931885,left_val:0.4058471918106079},{features:[[10,0,4,2,-1.],[12,0,2,1,2.],[10,1,2,1,2.]],threshold:-5.3354292176663876e-003,right_val:0.5158129930496216,left_val:0.3445056974887848},{features:[[7,12,3,1,-1.],[8,12,1,1,3.]],threshold:1.1287260567769408e-003,right_val:0.6075533032417297,left_val:0.4594863057136536},{features:[[8,11,4,8,-1.],[10,11,2,4,2.],[8,15,2,4,2.]],threshold:-0.0219692196696997,right_val:0.5228595733642578,left_val:0.1680400967597961},{features:[[9,9,2,2,-1.],[9,10,2,1,2.]],threshold:-2.1775320055894554e-004,right_val:0.5215672850608826,left_val:0.3861596882343292},{features:[[3,18,15,2,-1.],[3,19,15,1,2.]],threshold:2.0200149447191507e-004,right_val:0.4363039135932922,left_val:0.5517979264259338},{features:[[2,6,2,12,-1.],[2,6,1,6,2.],[3,12,1,6,2.]],threshold:-0.0217331498861313,right_val:0.4789851009845734,left_val:0.7999460101127625},{features:[[9,8,2,3,-1.],[9,9,2,1,3.]],threshold:-8.4399932529777288e-004,right_val:0.5374773144721985,left_val:0.4085975885391235},{features:[[7,10,3,2,-1.],[8,10,1,2,3.]],threshold:-4.3895249837078154e-004,right_val:0.4366143047809601,left_val:0.5470405220985413},{features:[[11,11,3,1,-1.],[12,11,1,1,3.]],threshold:1.5092400135472417e-003,right_val:0.5842149257659912,left_val:0.4988996982574463},{features:[[6,11,3,1,-1.],[7,11,1,1,3.]],threshold:-3.5547839943319559e-003,right_val:0.4721005856990814,left_val:0.6753690242767334},{features:[[9,2,4,2,-1.],[11,2,2,1,2.],[9,3,2,1,2.]],threshold:4.8191400128416717e-004,right_val:0.4357109069824219,left_val:0.5415853857994080},{features:[[4,12,2,3,-1.],[4,13,2,1,3.]],threshold:-6.0264398343861103e-003,right_val:0.4991880953311920,left_val:0.2258509993553162},{features:[[2,1,18,3,-1.],[8,1,6,3,3.]],threshold:-0.0116681400686502,right_val:0.4927498996257782,left_val:0.6256554722785950},{features:[[5,1,4,14,-1.],[7,1,2,14,2.]],threshold:-2.8718370012938976e-003,right_val:0.5245801806449890,left_val:0.3947784900665283},{features:[[8,16,12,3,-1.],[8,16,6,3,2.]],threshold:0.0170511696487665,right_val:0.5794224143028259,left_val:0.4752511084079742},{features:[[1,17,18,3,-1.],[7,17,6,3,3.]],threshold:-0.0133520802482963,right_val:0.4544535875320435,left_val:0.6041104793548584},{features:[[9,14,2,6,-1.],[9,17,2,3,2.]],threshold:-3.9301801007241011e-004,right_val:0.5544905066490173,left_val:0.4258275926113129},{features:[[9,12,1,8,-1.],[9,16,1,4,2.]],threshold:3.0483349692076445e-003,right_val:0.3780272901058197,left_val:0.5233420133590698},{features:[[9,14,2,3,-1.],[9,15,2,1,3.]],threshold:-4.3579288758337498e-003,right_val:0.4838674068450928,left_val:0.6371889114379883},{features:[[9,6,2,12,-1.],[9,10,2,4,3.]],threshold:5.6661018170416355e-003,right_val:0.4163666069507599,left_val:0.5374705791473389},{features:[[12,9,3,3,-1.],[12,10,3,1,3.]],threshold:6.0677339206449687e-005,right_val:0.5311625003814697,left_val:0.4638795852661133},{features:[[0,1,4,8,-1.],[2,1,2,8,2.]],threshold:0.0367381609976292,right_val:0.6466524004936218,left_val:0.4688656032085419},{features:[[9,1,6,2,-1.],[12,1,3,1,2.],[9,2,3,1,2.]],threshold:8.6528137326240540e-003,right_val:0.2188657969236374,left_val:0.5204318761825562},{features:[[1,3,12,14,-1.],[1,10,12,7,2.]],threshold:-0.1537135988473892,right_val:0.4958840012550354,left_val:0.1630371958017349},{features:[[8,12,4,2,-1.],[10,12,2,1,2.],[8,13,2,1,2.]],threshold:-4.1560421232134104e-004,right_val:0.4696458876132965,left_val:0.5774459242820740},{features:[[1,9,10,2,-1.],[1,9,5,1,2.],[6,10,5,1,2.]],threshold:-1.2640169588848948e-003,right_val:0.5217198133468628,left_val:0.3977175951004028},{features:[[8,15,4,3,-1.],[8,16,4,1,3.]],threshold:-3.5473341122269630e-003,right_val:0.4808315038681030,left_val:0.6046528220176697},{features:[[6,8,8,3,-1.],[6,9,8,1,3.]],threshold:3.0019069527043030e-005,right_val:0.5228201150894165,left_val:0.3996723890304565},{features:[[9,15,5,3,-1.],[9,16,5,1,3.]],threshold:1.3113019522279501e-003,right_val:0.5765997767448425,left_val:0.4712158143520355},{features:[[8,7,4,3,-1.],[8,8,4,1,3.]],threshold:-1.3374709524214268e-003,right_val:0.5253170132637024,left_val:0.4109584987163544},{features:[[7,7,6,2,-1.],[7,8,6,1,2.]],threshold:0.0208767093718052,right_val:0.1757981926202774,left_val:0.5202993750572205},{features:[[5,7,8,2,-1.],[5,7,4,1,2.],[9,8,4,1,2.]],threshold:-7.5497948564589024e-003,right_val:0.4694975018501282,left_val:0.6566609740257263},{features:[[12,9,3,3,-1.],[12,10,3,1,3.]],threshold:0.0241885501891375,right_val:0.3370220959186554,left_val:0.5128673911094666},{features:[[4,7,4,2,-1.],[4,8,4,1,2.]],threshold:-2.9358828905969858e-003,right_val:0.4694541096687317,left_val:0.6580786705017090},{features:[[14,2,6,9,-1.],[14,5,6,3,3.]],threshold:0.0575579293072224,right_val:0.2775259912014008,left_val:0.5146445035934448},{features:[[4,9,3,3,-1.],[5,9,1,3,3.]],threshold:-1.1343370424583554e-003,right_val:0.5192667245864868,left_val:0.3836601972579956},{features:[[12,9,3,3,-1.],[12,10,3,1,3.]],threshold:0.0168169997632504,right_val:0.6177260875701904,left_val:0.5085592865943909},{features:[[0,2,6,9,-1.],[0,5,6,3,3.]],threshold:5.0535178743302822e-003,right_val:0.3684791922569275,left_val:0.5138763189315796},{features:[[17,3,3,6,-1.],[18,3,1,6,3.]],threshold:-4.5874710194766521e-003,right_val:0.4835202097892761,left_val:0.5989655256271362},{features:[[0,3,3,6,-1.],[1,3,1,6,3.]],threshold:1.6882460331544280e-003,right_val:0.5723056793212891,left_val:0.4509486854076386},{features:[[17,14,1,2,-1.],[17,15,1,1,2.]],threshold:-1.6554000321775675e-003,right_val:0.5243319272994995,left_val:0.3496770858764648},{features:[[4,9,4,3,-1.],[6,9,2,3,2.]],threshold:-0.0193738006055355,right_val:0.4968712925910950,left_val:0.1120536997914314},{features:[[12,9,3,3,-1.],[12,10,3,1,3.]],threshold:0.0103744501248002,right_val:0.4395213127136231,left_val:0.5148196816444397},{features:[[5,9,3,3,-1.],[5,10,3,1,3.]],threshold:1.4973050565458834e-004,right_val:0.5269886851310730,left_val:0.4084999859333038},{features:[[9,5,6,8,-1.],[12,5,3,4,2.],[9,9,3,4,2.]],threshold:-0.0429819300770760,right_val:0.5018504261970520,left_val:0.6394104957580566},{features:[[5,5,6,8,-1.],[5,5,3,4,2.],[8,9,3,4,2.]],threshold:8.3065936341881752e-003,right_val:0.6698353290557861,left_val:0.4707553982734680},{features:[[16,1,4,6,-1.],[16,4,4,3,2.]],threshold:-4.1285790503025055e-003,right_val:0.5323647260665894,left_val:0.4541369080543518},{features:[[1,0,6,20,-1.],[3,0,2,20,3.]],threshold:1.7399420030415058e-003,right_val:0.5439866185188294,left_val:0.4333961904048920},{features:[[12,11,3,2,-1.],[13,11,1,2,3.]],threshold:1.1739750334527344e-004,right_val:0.5543426275253296,left_val:0.4579687118530273},{features:[[5,11,3,2,-1.],[6,11,1,2,3.]],threshold:1.8585780344437808e-004,right_val:0.5426754951477051,left_val:0.4324643909931183},{features:[[9,4,6,1,-1.],[11,4,2,1,3.]],threshold:5.5587692186236382e-003,right_val:0.3550611138343811,left_val:0.5257220864295960},{features:[[0,0,8,3,-1.],[4,0,4,3,2.]],threshold:-7.9851560294628143e-003,right_val:0.4630635976791382,left_val:0.6043018102645874},{features:[[15,0,2,5,-1.],[15,0,1,5,2.]],threshold:6.0594122624024749e-004,right_val:0.5533195137977600,left_val:0.4598254859447479},{features:[[4,1,3,2,-1.],[5,1,1,2,3.]],threshold:-2.2983040253166109e-004,right_val:0.5322461128234863,left_val:0.4130752086639404},{features:[[7,0,6,15,-1.],[9,0,2,15,3.]],threshold:4.3740210821852088e-004,right_val:0.5409289002418518,left_val:0.4043039977550507},{features:[[6,11,3,1,-1.],[7,11,1,1,3.]],threshold:2.9482020181603730e-004,right_val:0.5628852248191834,left_val:0.4494963884353638},{features:[[12,0,3,4,-1.],[13,0,1,4,3.]],threshold:0.0103126596659422,right_val:0.2704316973686218,left_val:0.5177510976791382},{features:[[5,4,6,1,-1.],[7,4,2,1,3.]],threshold:-7.7241109684109688e-003,right_val:0.4980553984642029,left_val:0.1988019049167633},{features:[[12,7,3,2,-1.],[12,8,3,1,2.]],threshold:-4.6797208487987518e-003,right_val:0.5018296241760254,left_val:0.6644750237464905},{features:[[0,1,4,6,-1.],[0,4,4,3,2.]],threshold:-5.0755459815263748e-003,right_val:0.5185269117355347,left_val:0.3898304998874664},{features:[[12,7,3,2,-1.],[12,8,3,1,2.]],threshold:2.2479740437120199e-003,right_val:0.5660336017608643,left_val:0.4801808893680573},{features:[[2,16,3,3,-1.],[2,17,3,1,3.]],threshold:8.3327008178457618e-004,right_val:0.3957188129425049,left_val:0.5210919976234436},{features:[[13,8,6,10,-1.],[16,8,3,5,2.],[13,13,3,5,2.]],threshold:-0.0412793308496475,right_val:0.5007054209709168,left_val:0.6154541969299316},{features:[[0,9,5,2,-1.],[0,10,5,1,2.]],threshold:-5.0930189900100231e-004,right_val:0.5228403806686401,left_val:0.3975942134857178},{features:[[12,11,2,2,-1.],[13,11,1,1,2.],[12,12,1,1,2.]],threshold:1.2568780221045017e-003,right_val:0.5939183235168457,left_val:0.4979138076305389},{features:[[3,15,3,3,-1.],[3,16,3,1,3.]],threshold:8.0048497766256332e-003,right_val:0.1633366048336029,left_val:0.4984497129917145},{features:[[12,7,3,2,-1.],[12,8,3,1,2.]],threshold:-1.1879300000146031e-003,right_val:0.4942624866962433,left_val:0.5904964804649353},{features:[[5,7,3,2,-1.],[5,8,3,1,2.]],threshold:6.1948952497914433e-004,right_val:0.5328726172447205,left_val:0.4199557900428772},{features:[[9,5,9,9,-1.],[9,8,9,3,3.]],threshold:6.6829859279096127e-003,right_val:0.4905889034271240,left_val:0.5418602824211121},{features:[[5,0,3,7,-1.],[6,0,1,7,3.]],threshold:-3.7062340416014194e-003,right_val:0.5138000249862671,left_val:0.3725939095020294},{features:[[5,2,12,5,-1.],[9,2,4,5,3.]],threshold:-0.0397394113242626,right_val:0.5050346851348877,left_val:0.6478961110115051},{features:[[6,11,2,2,-1.],[6,11,1,1,2.],[7,12,1,1,2.]],threshold:1.4085009461268783e-003,right_val:0.6377884149551392,left_val:0.4682339131832123},{features:[[15,15,3,2,-1.],[15,16,3,1,2.]],threshold:3.9322688826359808e-004,right_val:0.4150482118129730,left_val:0.5458530187606812},{features:[[2,15,3,2,-1.],[2,16,3,1,2.]],threshold:-1.8979819724336267e-003,right_val:0.5149704217910767,left_val:0.3690159916877747},{features:[[14,12,6,8,-1.],[17,12,3,4,2.],[14,16,3,4,2.]],threshold:-0.0139704402536154,right_val:0.4811357855796814,left_val:0.6050562858581543},{features:[[2,8,15,6,-1.],[7,8,5,6,3.]],threshold:-0.1010081991553307,right_val:0.4992361962795258,left_val:0.2017080038785934},{features:[[2,2,18,17,-1.],[8,2,6,17,3.]],threshold:-0.0173469204455614,right_val:0.4899486005306244,left_val:0.5713148713111877},{features:[[5,1,4,1,-1.],[7,1,2,1,2.]],threshold:1.5619759506080300e-004,right_val:0.5392642021179199,left_val:0.4215388894081116},{features:[[5,2,12,5,-1.],[9,2,4,5,3.]],threshold:0.1343892961740494,right_val:0.3767612874507904,left_val:0.5136151909828186},{features:[[3,2,12,5,-1.],[7,2,4,5,3.]],threshold:-0.0245822407305241,right_val:0.4747906923294067,left_val:0.7027357816696167},{features:[[4,9,12,4,-1.],[10,9,6,2,2.],[4,11,6,2,2.]],threshold:-3.8553720805794001e-003,right_val:0.5427716970443726,left_val:0.4317409098148346},{features:[[5,15,6,2,-1.],[5,15,3,1,2.],[8,16,3,1,2.]],threshold:-2.3165249731391668e-003,right_val:0.4618647992610931,left_val:0.5942698717117310},{features:[[10,14,2,3,-1.],[10,15,2,1,3.]],threshold:-4.8518120311200619e-003,right_val:0.4884895086288452,left_val:0.6191568970680237},{features:[[0,13,20,2,-1.],[0,13,10,1,2.],[10,14,10,1,2.]],threshold:2.4699938949197531e-003,right_val:0.4017199873924255,left_val:0.5256664752960205},{features:[[4,9,12,8,-1.],[10,9,6,4,2.],[4,13,6,4,2.]],threshold:0.0454969592392445,right_val:0.2685773968696594,left_val:0.5237867832183838},{features:[[8,13,3,6,-1.],[8,16,3,3,2.]],threshold:-0.0203195996582508,right_val:0.4979738891124725,left_val:0.2130445986986160},{features:[[10,12,2,2,-1.],[10,13,2,1,2.]],threshold:2.6994998916052282e-004,right_val:0.5543122291564941,left_val:0.4814041852951050},{features:[[9,12,2,2,-1.],[9,12,1,1,2.],[10,13,1,1,2.]],threshold:-1.8232699949294329e-003,right_val:0.4709989130496979,left_val:0.6482579708099365},{features:[[4,11,14,4,-1.],[11,11,7,2,2.],[4,13,7,2,2.]],threshold:-6.3015790656208992e-003,right_val:0.5306236147880554,left_val:0.4581927955150604},{features:[[8,5,4,2,-1.],[8,6,4,1,2.]],threshold:-2.4139499873854220e-004,right_val:0.4051763117313385,left_val:0.5232086777687073},{features:[[10,10,6,3,-1.],[12,10,2,3,3.]],threshold:-1.0330369696021080e-003,right_val:0.4789193868637085,left_val:0.5556201934814453},{features:[[2,14,1,2,-1.],[2,15,1,1,2.]],threshold:1.8041160365100950e-004,right_val:0.4011810123920441,left_val:0.5229442715644836},{features:[[13,8,6,12,-1.],[16,8,3,6,2.],[13,14,3,6,2.]],threshold:-0.0614078603684902,right_val:0.5010703206062317,left_val:0.6298682093620300},{features:[[1,8,6,12,-1.],[1,8,3,6,2.],[4,14,3,6,2.]],threshold:-0.0695439130067825,right_val:0.4773184061050415,left_val:0.7228280901908875},{features:[[10,0,6,10,-1.],[12,0,2,10,3.]],threshold:-0.0705426633358002,right_val:0.5182529091835022,left_val:0.2269513010978699},{features:[[5,11,8,4,-1.],[5,11,4,2,2.],[9,13,4,2,2.]],threshold:2.4423799477517605e-003,right_val:0.4098151028156281,left_val:0.5237097144126892},{features:[[10,16,8,4,-1.],[14,16,4,2,2.],[10,18,4,2,2.]],threshold:1.5494349645450711e-003,right_val:0.5468043088912964,left_val:0.4773750901222229},{features:[[7,7,6,6,-1.],[9,7,2,6,3.]],threshold:-0.0239142198115587,right_val:0.4783824980258942,left_val:0.7146975994110107},{features:[[10,2,4,10,-1.],[10,2,2,10,2.]],threshold:-0.0124536901712418,right_val:0.5241122841835022,left_val:0.2635296881198883},{features:[[6,1,4,9,-1.],[8,1,2,9,2.]],threshold:-2.0760179904755205e-004,right_val:0.5113608837127686,left_val:0.3623757064342499},{features:[[12,19,2,1,-1.],[12,19,1,1,2.]],threshold:2.9781080229440704e-005,right_val:0.5432801842689514,left_val:0.4705932140350342}],threshold:90.2533493041992190},{simpleClassifiers:[{features:[[1,2,4,9,-1.],[3,2,2,9,2.]],threshold:0.0117727499455214,right_val:0.6421167254447937,left_val:0.3860518932342529},{features:[[7,5,6,4,-1.],[9,5,2,4,3.]],threshold:0.0270375702530146,right_val:0.6754038929939270,left_val:0.4385654926300049},{features:[[9,4,2,4,-1.],[9,6,2,2,2.]],threshold:-3.6419500247575343e-005,right_val:0.3423315882682800,left_val:0.5487101078033447},{features:[[14,5,2,8,-1.],[14,9,2,4,2.]],threshold:1.9995409529656172e-003,right_val:0.5400317907333374,left_val:0.3230532109737396},{features:[[7,6,5,12,-1.],[7,12,5,6,2.]],threshold:4.5278300531208515e-003,right_val:0.2935043871402741,left_val:0.5091639757156372},{features:[[14,6,2,6,-1.],[14,9,2,3,2.]],threshold:4.7890920541249216e-004,right_val:0.5344064235687256,left_val:0.4178153872489929},{features:[[4,6,2,6,-1.],[4,9,2,3,2.]],threshold:1.1720920447260141e-003,right_val:0.5132070779800415,left_val:0.2899182140827179},{features:[[8,15,10,4,-1.],[13,15,5,2,2.],[8,17,5,2,2.]],threshold:9.5305702416226268e-004,right_val:0.5560845136642456,left_val:0.4280124902725220},{features:[[6,18,2,2,-1.],[7,18,1,2,2.]],threshold:1.5099150004971307e-005,right_val:0.5404760241508484,left_val:0.4044871926307678},{features:[[11,3,6,2,-1.],[11,4,6,1,2.]],threshold:-6.0817901976406574e-004,right_val:0.5503466129302979,left_val:0.4271768927574158},{features:[[2,0,16,6,-1.],[2,2,16,2,3.]],threshold:3.3224520739167929e-003,right_val:0.5369734764099121,left_val:0.3962723910808563},{features:[[11,3,6,2,-1.],[11,4,6,1,2.]],threshold:-1.1037490330636501e-003,right_val:0.5237749814987183,left_val:0.4727177917957306},{features:[[4,11,10,3,-1.],[4,12,10,1,3.]],threshold:-1.4350269921123981e-003,right_val:0.4223509132862091,left_val:0.5603008270263672},{features:[[11,3,6,2,-1.],[11,4,6,1,2.]],threshold:2.0767399109899998e-003,right_val:0.4732725918292999,left_val:0.5225917100906372},{features:[[3,3,6,2,-1.],[3,4,6,1,2.]],threshold:-1.6412809782195836e-004,right_val:0.5432739853858948,left_val:0.3999075889587402},{features:[[16,0,4,7,-1.],[16,0,2,7,2.]],threshold:8.8302437216043472e-003,right_val:0.6027327179908752,left_val:0.4678385853767395},{features:[[0,14,9,6,-1.],[0,16,9,2,3.]],threshold:-0.0105520701035857,right_val:0.5213974714279175,left_val:0.3493967056274414},{features:[[9,16,3,3,-1.],[9,17,3,1,3.]],threshold:-2.2731600329279900e-003,right_val:0.4749062955379486,left_val:0.6185818910598755},{features:[[4,6,6,2,-1.],[6,6,2,2,3.]],threshold:-8.4786332445219159e-004,right_val:0.3843482136726379,left_val:0.5285341143608093},{features:[[15,11,1,3,-1.],[15,12,1,1,3.]],threshold:1.2081359745934606e-003,right_val:0.3447335958480835,left_val:0.5360640883445740},{features:[[5,5,2,3,-1.],[5,6,2,1,3.]],threshold:2.6512730401009321e-003,right_val:0.6193962097167969,left_val:0.4558292031288147},{features:[[10,9,2,2,-1.],[10,10,2,1,2.]],threshold:-1.1012479662895203e-003,right_val:0.5327628254890442,left_val:0.3680230081081390},{features:[[3,1,4,3,-1.],[5,1,2,3,2.]],threshold:4.9561518244445324e-004,right_val:0.5274940729141235,left_val:0.3960595130920410},{features:[[16,0,4,7,-1.],[16,0,2,7,2.]],threshold:-0.0439017713069916,right_val:0.4992839097976685,left_val:0.7020444869995117},{features:[[0,0,20,1,-1.],[10,0,10,1,2.]],threshold:0.0346903502941132,right_val:0.2766602933406830,left_val:0.5049164295196533},{features:[[15,11,1,3,-1.],[15,12,1,1,3.]],threshold:-2.7442190330475569e-003,right_val:0.5274971127510071,left_val:0.2672632932662964},{features:[[0,4,3,4,-1.],[1,4,1,4,3.]],threshold:3.3316588960587978e-003,right_val:0.6001101732254028,left_val:0.4579482972621918},{features:[[16,3,3,6,-1.],[16,5,3,2,3.]],threshold:-0.0200445707887411,right_val:0.5235717892646790,left_val:0.3171594142913818},{features:[[1,3,3,6,-1.],[1,5,3,2,3.]],threshold:1.3492030557245016e-003,right_val:0.4034324884414673,left_val:0.5265362858772278},{features:[[6,2,12,6,-1.],[12,2,6,3,2.],[6,5,6,3,2.]],threshold:2.9702018946409225e-003,right_val:0.4571984112262726,left_val:0.5332456827163696},{features:[[8,10,4,3,-1.],[8,11,4,1,3.]],threshold:6.3039981760084629e-003,right_val:0.6034635901451111,left_val:0.4593310952186585},{features:[[4,2,14,6,-1.],[11,2,7,3,2.],[4,5,7,3,2.]],threshold:-0.0129365902394056,right_val:0.5372971296310425,left_val:0.4437963962554932},{features:[[9,11,2,3,-1.],[9,12,2,1,3.]],threshold:4.0148729458451271e-003,right_val:0.6437833905220032,left_val:0.4680323898792267},{features:[[15,13,2,3,-1.],[15,14,2,1,3.]],threshold:-2.6401679497212172e-003,right_val:0.5314332842826843,left_val:0.3709631860256195},{features:[[8,12,4,3,-1.],[8,13,4,1,3.]],threshold:0.0139184398576617,right_val:0.7130808830261231,left_val:0.4723555147647858},{features:[[15,11,1,3,-1.],[15,12,1,1,3.]],threshold:-4.5087869511917233e-004,right_val:0.5370404124259949,left_val:0.4492394030094147},{features:[[7,13,5,2,-1.],[7,14,5,1,2.]],threshold:2.5384349282830954e-004,right_val:0.5514402985572815,left_val:0.4406864047050476},{features:[[7,12,6,3,-1.],[7,13,6,1,3.]],threshold:2.2710000630468130e-003,right_val:0.5967984199523926,left_val:0.4682416915893555},{features:[[5,11,4,4,-1.],[5,13,4,2,2.]],threshold:2.4120779708027840e-003,right_val:0.3018598854541779,left_val:0.5079392194747925},{features:[[11,4,3,3,-1.],[12,4,1,3,3.]],threshold:-3.6025670851813629e-005,right_val:0.4471096992492676,left_val:0.5601037144660950},{features:[[6,4,3,3,-1.],[7,4,1,3,3.]],threshold:-7.4905529618263245e-003,right_val:0.4989944100379944,left_val:0.2207535058259964},{features:[[16,5,3,6,-1.],[17,5,1,6,3.]],threshold:-0.0175131205469370,right_val:0.5017648935317993,left_val:0.6531215906143189},{features:[[3,6,12,7,-1.],[7,6,4,7,3.]],threshold:0.1428163051605225,right_val:0.1482062041759491,left_val:0.4967963099479675},{features:[[16,5,3,6,-1.],[17,5,1,6,3.]],threshold:5.5345268920063972e-003,right_val:0.5954223871231079,left_val:0.4898946881294251},{features:[[3,13,2,3,-1.],[3,14,2,1,3.]],threshold:-9.6323591424152255e-004,right_val:0.5196074247360230,left_val:0.3927116990089417},{features:[[16,5,3,6,-1.],[17,5,1,6,3.]],threshold:-2.0370010752230883e-003,right_val:0.4884858131408691,left_val:0.5613325238227844},{features:[[1,5,3,6,-1.],[2,5,1,6,3.]],threshold:1.6614829655736685e-003,right_val:0.5578880906105042,left_val:0.4472880065441132},{features:[[1,9,18,1,-1.],[7,9,6,1,3.]],threshold:-3.1188090797513723e-003,right_val:0.5397477746009827,left_val:0.3840532898902893},{features:[[0,9,8,7,-1.],[4,9,4,7,2.]],threshold:-6.4000617712736130e-003,right_val:0.4533218145370483,left_val:0.5843983888626099},{features:[[12,11,8,2,-1.],[12,12,8,1,2.]],threshold:3.1319601112045348e-004,right_val:0.4234727919101715,left_val:0.5439221858978272},{features:[[0,11,8,2,-1.],[0,12,8,1,2.]],threshold:-0.0182220991700888,right_val:0.4958404898643494,left_val:0.1288464963436127},{features:[[9,13,2,3,-1.],[9,14,2,1,3.]],threshold:8.7969247251749039e-003,right_val:0.7153480052947998,left_val:0.4951297938823700},{features:[[4,10,12,4,-1.],[4,10,6,2,2.],[10,12,6,2,2.]],threshold:-4.2395070195198059e-003,right_val:0.5194936990737915,left_val:0.3946599960327148},{features:[[9,3,3,7,-1.],[10,3,1,7,3.]],threshold:9.7086271271109581e-003,right_val:0.6064900159835815,left_val:0.4897503852844238},{features:[[7,2,3,5,-1.],[8,2,1,5,3.]],threshold:-3.9934171363711357e-003,right_val:0.5060828924179077,left_val:0.3245440125465393},{features:[[9,12,4,6,-1.],[11,12,2,3,2.],[9,15,2,3,2.]],threshold:-0.0167850591242313,right_val:0.5203778743743897,left_val:0.1581953018903732},{features:[[8,7,3,6,-1.],[9,7,1,6,3.]],threshold:0.0182720907032490,right_val:0.6626979112625122,left_val:0.4680935144424439},{features:[[15,4,4,2,-1.],[15,5,4,1,2.]],threshold:5.6872838176786900e-003,right_val:0.3512184917926788,left_val:0.5211697816848755},{features:[[8,7,3,3,-1.],[9,7,1,3,3.]],threshold:-1.0739039862528443e-003,right_val:0.4529845118522644,left_val:0.5768386125564575},{features:[[14,2,6,4,-1.],[14,4,6,2,2.]],threshold:-3.7093870341777802e-003,right_val:0.5313581228256226,left_val:0.4507763087749481},{features:[[7,16,6,1,-1.],[9,16,2,1,3.]],threshold:-2.1110709349159151e-004,right_val:0.4333376884460449,left_val:0.5460820198059082},{features:[[15,13,2,3,-1.],[15,14,2,1,3.]],threshold:1.0670139454305172e-003,right_val:0.4078390896320343,left_val:0.5371856093406677},{features:[[8,7,3,10,-1.],[9,7,1,10,3.]],threshold:3.5943021066486835e-003,right_val:0.5643836259841919,left_val:0.4471287131309509},{features:[[11,10,2,6,-1.],[11,12,2,2,3.]],threshold:-5.1776031032204628e-003,right_val:0.5280330181121826,left_val:0.4499393105506897},{features:[[6,10,4,1,-1.],[8,10,2,1,2.]],threshold:-2.5414369883947074e-004,right_val:0.4407708048820496,left_val:0.5516173243522644},{features:[[10,9,2,2,-1.],[10,10,2,1,2.]],threshold:6.3522560521960258e-003,right_val:0.2465227991342545,left_val:0.5194190144538879},{features:[[8,9,2,2,-1.],[8,10,2,1,2.]],threshold:-4.4205080484971404e-004,right_val:0.5139682292938232,left_val:0.3830705881118774},{features:[[12,7,2,2,-1.],[13,7,1,1,2.],[12,8,1,1,2.]],threshold:7.4488727841526270e-004,right_val:0.5974786877632141,left_val:0.4891090989112854},{features:[[5,7,2,2,-1.],[5,7,1,1,2.],[6,8,1,1,2.]],threshold:-3.5116379149258137e-003,right_val:0.4768764972686768,left_val:0.7413681745529175},{features:[[13,0,3,14,-1.],[14,0,1,14,3.]],threshold:-0.0125409103929996,right_val:0.5252826809883118,left_val:0.3648819029331207},{features:[[4,0,3,14,-1.],[5,0,1,14,3.]],threshold:9.4931852072477341e-003,right_val:0.3629586994647980,left_val:0.5100492835044861},{features:[[13,4,3,14,-1.],[14,4,1,14,3.]],threshold:0.0129611501470208,right_val:0.4333561062812805,left_val:0.5232442021369934},{features:[[9,14,2,3,-1.],[9,15,2,1,3.]],threshold:4.7209449112415314e-003,right_val:0.6331052780151367,left_val:0.4648149013519287},{features:[[8,14,4,3,-1.],[8,15,4,1,3.]],threshold:-2.3119079414755106e-003,right_val:0.4531058073043823,left_val:0.5930309891700745},{features:[[4,2,3,16,-1.],[5,2,1,16,3.]],threshold:-2.8262299019843340e-003,right_val:0.5257101058959961,left_val:0.3870477974414825},{features:[[7,2,8,10,-1.],[7,7,8,5,2.]],threshold:-1.4311339473351836e-003,right_val:0.4561854898929596,left_val:0.5522503256797791},{features:[[6,14,7,3,-1.],[6,15,7,1,3.]],threshold:1.9378310535103083e-003,right_val:0.5736966729164124,left_val:0.4546220898628235},{features:[[9,2,10,12,-1.],[14,2,5,6,2.],[9,8,5,6,2.]],threshold:2.6343559147790074e-004,right_val:0.4571875035762787,left_val:0.5345739126205444},{features:[[6,7,8,2,-1.],[6,8,8,1,2.]],threshold:7.8257522545754910e-004,right_val:0.5220187902450562,left_val:0.3967815935611725},{features:[[8,13,4,6,-1.],[8,16,4,3,2.]],threshold:-0.0195504408329725,right_val:0.5243508219718933,left_val:0.2829642891883850},{features:[[6,6,1,3,-1.],[6,7,1,1,3.]],threshold:4.3914958951063454e-004,right_val:0.5899090170860291,left_val:0.4590066969394684},{features:[[16,2,4,6,-1.],[16,4,4,2,3.]],threshold:0.0214520003646612,right_val:0.2855378985404968,left_val:0.5231410861015320},{features:[[6,6,4,2,-1.],[6,6,2,1,2.],[8,7,2,1,2.]],threshold:5.8973580598831177e-004,right_val:0.5506421923637390,left_val:0.4397256970405579},{features:[[16,2,4,6,-1.],[16,4,4,2,3.]],threshold:-0.0261576101183891,right_val:0.5189175009727478,left_val:0.3135079145431519},{features:[[0,2,4,6,-1.],[0,4,4,2,3.]],threshold:-0.0139598604291677,right_val:0.5040717720985413,left_val:0.3213272988796234},{features:[[9,6,2,6,-1.],[9,6,1,6,2.]],threshold:-6.3699018210172653e-003,right_val:0.4849506914615631,left_val:0.6387544870376587},{features:[[3,4,6,10,-1.],[3,9,6,5,2.]],threshold:-8.5613820701837540e-003,right_val:0.5032019019126892,left_val:0.2759132087230682},{features:[[9,5,2,6,-1.],[9,5,1,6,2.]],threshold:9.6622901037335396e-004,right_val:0.5834879279136658,left_val:0.4685640931129456},{features:[[3,13,2,3,-1.],[3,14,2,1,3.]],threshold:7.6550268568098545e-004,right_val:0.3896422088146210,left_val:0.5175207257270813},{features:[[13,13,3,2,-1.],[13,14,3,1,2.]],threshold:-8.1833340227603912e-003,right_val:0.5208122134208679,left_val:0.2069136947393417},{features:[[2,16,10,4,-1.],[2,16,5,2,2.],[7,18,5,2,2.]],threshold:-9.3976939097046852e-003,right_val:0.4641222953796387,left_val:0.6134091019630432},{features:[[5,6,10,6,-1.],[10,6,5,3,2.],[5,9,5,3,2.]],threshold:4.8028980381786823e-003,right_val:0.4395219981670380,left_val:0.5454108119010925},{features:[[7,14,1,3,-1.],[7,15,1,1,3.]],threshold:-3.5680569708347321e-003,right_val:0.4681093990802765,left_val:0.6344485282897949},{features:[[14,16,6,3,-1.],[14,17,6,1,3.]],threshold:4.0733120404183865e-003,right_val:0.4015620052814484,left_val:0.5292683243751526},{features:[[5,4,3,3,-1.],[5,5,3,1,3.]],threshold:1.2568129459396005e-003,right_val:0.5452824831008911,left_val:0.4392988085746765},{features:[[7,4,10,3,-1.],[7,5,10,1,3.]],threshold:-2.9065010603517294e-003,right_val:0.4863379895687103,left_val:0.5898832082748413},{features:[[0,4,5,4,-1.],[0,6,5,2,2.]],threshold:-2.4409340694546700e-003,right_val:0.5247421860694885,left_val:0.4069364964962006},{features:[[13,11,3,9,-1.],[13,14,3,3,3.]],threshold:0.0248307008296251,right_val:0.3682524859905243,left_val:0.5182725787162781},{features:[[4,11,3,9,-1.],[4,14,3,3,3.]],threshold:-0.0488540083169937,right_val:0.4961281120777130,left_val:0.1307577937841415},{features:[[9,7,2,1,-1.],[9,7,1,1,2.]],threshold:-1.6110379947349429e-003,right_val:0.4872662127017975,left_val:0.6421005725860596},{features:[[5,0,6,17,-1.],[7,0,2,17,3.]],threshold:-0.0970094799995422,right_val:0.4950988888740540,left_val:0.0477693490684032},{features:[[10,3,6,3,-1.],[10,3,3,3,2.]],threshold:1.1209240183234215e-003,right_val:0.5354745984077454,left_val:0.4616267085075378},{features:[[2,2,15,4,-1.],[7,2,5,4,3.]],threshold:-1.3064090162515640e-003,right_val:0.4638805985450745,left_val:0.6261854171752930},{features:[[8,2,8,2,-1.],[12,2,4,1,2.],[8,3,4,1,2.]],threshold:4.5771620352752507e-004,right_val:0.4646640121936798,left_val:0.5384417772293091},{features:[[8,1,3,6,-1.],[8,3,3,2,3.]],threshold:-6.3149951165542006e-004,right_val:0.5130257010459900,left_val:0.3804047107696533},{features:[[9,17,2,2,-1.],[9,18,2,1,2.]],threshold:1.4505970466416329e-004,right_val:0.5664461851119995,left_val:0.4554310142993927},{features:[[0,0,2,14,-1.],[1,0,1,14,2.]],threshold:-0.0164745505899191,right_val:0.4715859889984131,left_val:0.6596958041191101},{features:[[12,0,7,3,-1.],[12,1,7,1,3.]],threshold:0.0133695797994733,right_val:0.3035964965820313,left_val:0.5195466279983521},{features:[[1,14,1,2,-1.],[1,15,1,1,2.]],threshold:1.0271780047332868e-004,right_val:0.4107066094875336,left_val:0.5229176282882690},{features:[[14,12,2,8,-1.],[15,12,1,4,2.],[14,16,1,4,2.]],threshold:-5.5311559699475765e-003,right_val:0.4960907101631165,left_val:0.6352887749671936},{features:[[1,0,7,3,-1.],[1,1,7,1,3.]],threshold:-2.6187049224972725e-003,right_val:0.5140984058380127,left_val:0.3824546039104462},{features:[[14,12,2,8,-1.],[15,12,1,4,2.],[14,16,1,4,2.]],threshold:5.0834268331527710e-003,right_val:0.6220818758010864,left_val:0.4950439929962158},{features:[[6,0,8,12,-1.],[6,0,4,6,2.],[10,6,4,6,2.]],threshold:0.0798181593418121,right_val:0.1322475969791412,left_val:0.4952335953712463},{features:[[6,1,8,9,-1.],[6,4,8,3,3.]],threshold:-0.0992265865206718,right_val:0.5008416771888733,left_val:0.7542728781700134},{features:[[5,2,2,2,-1.],[5,3,2,1,2.]],threshold:-6.5174017800018191e-004,right_val:0.5130121111869812,left_val:0.3699302971363068},{features:[[13,14,6,6,-1.],[16,14,3,3,2.],[13,17,3,3,2.]],threshold:-0.0189968496561050,right_val:0.4921202957630158,left_val:0.6689178943634033},{features:[[0,17,20,2,-1.],[0,17,10,1,2.],[10,18,10,1,2.]],threshold:0.0173468999564648,right_val:0.1859198063611984,left_val:0.4983300864696503},{features:[[10,3,2,6,-1.],[11,3,1,3,2.],[10,6,1,3,2.]],threshold:5.5082101607695222e-004,right_val:0.5522121787071228,left_val:0.4574424028396606},{features:[[5,12,6,2,-1.],[8,12,3,2,2.]],threshold:2.0056050270795822e-003,right_val:0.3856469988822937,left_val:0.5131744742393494},{features:[[10,7,6,13,-1.],[10,7,3,13,2.]],threshold:-7.7688191086053848e-003,right_val:0.5434309244155884,left_val:0.4361700117588043},{features:[[5,15,10,5,-1.],[10,15,5,5,2.]],threshold:0.0508782789111137,right_val:0.6840639710426331,left_val:0.4682720899581909},{features:[[10,4,4,10,-1.],[10,4,2,10,2.]],threshold:-2.2901780903339386e-003,right_val:0.5306099057197571,left_val:0.4329245090484619},{features:[[5,7,2,1,-1.],[6,7,1,1,2.]],threshold:-1.5715380141045898e-004,right_val:0.4378164112567902,left_val:0.5370057225227356},{features:[[10,3,6,7,-1.],[10,3,3,7,2.]],threshold:0.1051924005150795,right_val:0.0673614665865898,left_val:0.5137274265289307},{features:[[4,3,6,7,-1.],[7,3,3,7,2.]],threshold:2.7198919560760260e-003,right_val:0.5255665183067322,left_val:0.4112060964107513},{features:[[1,7,18,5,-1.],[7,7,6,5,3.]],threshold:0.0483377799391747,right_val:0.4438967108726502,left_val:0.5404623746871948},{features:[[3,17,4,3,-1.],[5,17,2,3,2.]],threshold:9.5703761326149106e-004,right_val:0.5399510860443115,left_val:0.4355969130992889},{features:[[8,14,12,6,-1.],[14,14,6,3,2.],[8,17,6,3,2.]],threshold:-0.0253712590783834,right_val:0.5031024813652039,left_val:0.5995175242424011},{features:[[0,13,20,4,-1.],[0,13,10,2,2.],[10,15,10,2,2.]],threshold:0.0524579510092735,right_val:0.1398351043462753,left_val:0.4950287938117981},{features:[[4,5,14,2,-1.],[11,5,7,1,2.],[4,6,7,1,2.]],threshold:-0.0123656298965216,right_val:0.4964106082916260,left_val:0.6397299170494080},{features:[[1,2,10,12,-1.],[1,2,5,6,2.],[6,8,5,6,2.]],threshold:-0.1458971947431564,right_val:0.4946322143077850,left_val:0.1001669988036156},{features:[[6,1,14,3,-1.],[6,2,14,1,3.]],threshold:-0.0159086007624865,right_val:0.5208340883255005,left_val:0.3312329947948456},{features:[[8,16,2,3,-1.],[8,17,2,1,3.]],threshold:3.9486068999394774e-004,right_val:0.5426102876663208,left_val:0.4406363964080811},{features:[[9,17,3,2,-1.],[10,17,1,2,3.]],threshold:-5.2454001270234585e-003,right_val:0.5189967155456543,left_val:0.2799589931964874},{features:[[5,15,4,2,-1.],[5,15,2,1,2.],[7,16,2,1,2.]],threshold:-5.0421799533069134e-003,right_val:0.4752142131328583,left_val:0.6987580060958862},{features:[[10,15,1,3,-1.],[10,16,1,1,3.]],threshold:2.9812189750373363e-003,right_val:0.6307479739189148,left_val:0.4983288943767548},{features:[[8,16,4,4,-1.],[8,16,2,2,2.],[10,18,2,2,2.]],threshold:-7.2884308174252510e-003,right_val:0.5026869773864746,left_val:0.2982333004474640},{features:[[6,11,8,6,-1.],[6,14,8,3,2.]],threshold:1.5094350092113018e-003,right_val:0.3832970857620239,left_val:0.5308442115783691},{features:[[2,13,5,2,-1.],[2,14,5,1,2.]],threshold:-9.3340799212455750e-003,right_val:0.4969817101955414,left_val:0.2037964016199112},{features:[[13,14,6,6,-1.],[16,14,3,3,2.],[13,17,3,3,2.]],threshold:0.0286671407520771,right_val:0.6928027272224426,left_val:0.5025696754455566},{features:[[1,9,18,4,-1.],[7,9,6,4,3.]],threshold:0.1701968014240265,right_val:0.1476442962884903,left_val:0.4960052967071533},{features:[[13,14,6,6,-1.],[16,14,3,3,2.],[13,17,3,3,2.]],threshold:-3.2614478841423988e-003,right_val:0.4826056063175201,left_val:0.5603063702583313},{features:[[0,2,1,6,-1.],[0,4,1,2,3.]],threshold:5.5769277969375253e-004,right_val:0.4129633009433746,left_val:0.5205562114715576},{features:[[5,0,15,20,-1.],[5,10,15,10,2.]],threshold:0.3625833988189697,right_val:0.3768612146377564,left_val:0.5221652984619141},{features:[[1,14,6,6,-1.],[1,14,3,3,2.],[4,17,3,3,2.]],threshold:-0.0116151301190257,right_val:0.4637489914894104,left_val:0.6022682785987854},{features:[[8,14,4,6,-1.],[10,14,2,3,2.],[8,17,2,3,2.]],threshold:-4.0795197710394859e-003,right_val:0.5337479114532471,left_val:0.4070447087287903},{features:[[7,11,2,1,-1.],[8,11,1,1,2.]],threshold:5.7204300537705421e-004,right_val:0.5900393128395081,left_val:0.4601835012435913},{features:[[9,17,3,2,-1.],[10,17,1,2,3.]],threshold:6.7543348995968699e-004,right_val:0.4345428943634033,left_val:0.5398252010345459},{features:[[8,17,3,2,-1.],[9,17,1,2,3.]],threshold:6.3295697327703238e-004,right_val:0.4051358997821808,left_val:0.5201563239097595},{features:[[12,14,4,6,-1.],[14,14,2,3,2.],[12,17,2,3,2.]],threshold:1.2435320531949401e-003,right_val:0.5547441244125366,left_val:0.4642387926578522},{features:[[4,14,4,6,-1.],[4,14,2,3,2.],[6,17,2,3,2.]],threshold:-4.7363857738673687e-003,right_val:0.4672552049160004,left_val:0.6198567152023315},{features:[[13,14,2,6,-1.],[14,14,1,3,2.],[13,17,1,3,2.]],threshold:-6.4658462069928646e-003,right_val:0.5019000768661499,left_val:0.6837332844734192},{features:[[5,14,2,6,-1.],[5,14,1,3,2.],[6,17,1,3,2.]],threshold:3.5017321351915598e-004,right_val:0.5363622903823853,left_val:0.4344803094863892},{features:[[7,0,6,12,-1.],[7,4,6,4,3.]],threshold:1.5754920605104417e-004,right_val:0.5732020735740662,left_val:0.4760079085826874},{features:[[0,7,12,2,-1.],[4,7,4,2,3.]],threshold:9.9774366244673729e-003,right_val:0.3635039925575256,left_val:0.5090985894203186},{features:[[10,3,3,13,-1.],[11,3,1,13,3.]],threshold:-4.1464529931545258e-004,right_val:0.4593802094459534,left_val:0.5570064783096314},{features:[[7,3,3,13,-1.],[8,3,1,13,3.]],threshold:-3.5888899583369493e-004,right_val:0.4339134991168976,left_val:0.5356845855712891},{features:[[10,8,6,3,-1.],[10,9,6,1,3.]],threshold:4.0463250479660928e-004,right_val:0.5436776876449585,left_val:0.4439803063869476},{features:[[3,11,3,2,-1.],[4,11,1,2,3.]],threshold:-8.2184787606820464e-004,right_val:0.5176299214363098,left_val:0.4042294919490814},{features:[[13,12,6,8,-1.],[16,12,3,4,2.],[13,16,3,4,2.]],threshold:5.9467419050633907e-003,right_val:0.5633779764175415,left_val:0.4927651882171631},{features:[[7,6,6,5,-1.],[9,6,2,5,3.]],threshold:-0.0217533893883228,right_val:0.4800840914249420,left_val:0.8006293773651123},{features:[[17,11,2,7,-1.],[17,11,1,7,2.]],threshold:-0.0145403798669577,right_val:0.5182222723960877,left_val:0.3946054875850678},{features:[[3,13,8,2,-1.],[7,13,4,2,2.]],threshold:-0.0405107699334621,right_val:0.4935792982578278,left_val:0.0213249903172255},{features:[[6,9,8,3,-1.],[6,10,8,1,3.]],threshold:-5.8458268176764250e-004,right_val:0.5314025282859802,left_val:0.4012795984745026},{features:[[4,3,4,3,-1.],[4,4,4,1,3.]],threshold:5.5151800625026226e-003,right_val:0.5896260738372803,left_val:0.4642418920993805},{features:[[11,3,4,3,-1.],[11,4,4,1,3.]],threshold:-6.0626221820712090e-003,right_val:0.5016477704048157,left_val:0.6502159237861633},{features:[[1,4,17,12,-1.],[1,8,17,4,3.]],threshold:0.0945358425378799,right_val:0.4126827120780945,left_val:0.5264708995819092},{features:[[11,3,4,3,-1.],[11,4,4,1,3.]],threshold:4.7315051779150963e-003,right_val:0.5892447829246521,left_val:0.4879199862480164},{features:[[4,8,6,3,-1.],[4,9,6,1,3.]],threshold:-5.2571471314877272e-004,right_val:0.5189412832260132,left_val:0.3917280137538910},{features:[[12,3,5,3,-1.],[12,4,5,1,3.]],threshold:-2.5464049540460110e-003,right_val:0.4985705912113190,left_val:0.5837599039077759},{features:[[1,11,2,7,-1.],[2,11,1,7,2.]],threshold:-0.0260756891220808,right_val:0.4955821931362152,left_val:0.1261983960866928},{features:[[15,12,2,8,-1.],[16,12,1,4,2.],[15,16,1,4,2.]],threshold:-5.4779709316790104e-003,right_val:0.5010265707969666,left_val:0.5722513794898987},{features:[[4,8,11,3,-1.],[4,9,11,1,3.]],threshold:5.1337741315364838e-003,right_val:0.4226376116275787,left_val:0.5273262262344360},{features:[[9,13,6,2,-1.],[12,13,3,1,2.],[9,14,3,1,2.]],threshold:4.7944980906322598e-004,right_val:0.5819587111473084,left_val:0.4450066983699799},{features:[[6,13,4,3,-1.],[6,14,4,1,3.]],threshold:-2.1114079281687737e-003,right_val:0.4511714875698090,left_val:0.5757653117179871},{features:[[9,12,3,3,-1.],[10,12,1,3,3.]],threshold:-0.0131799904629588,right_val:0.5160734057426453,left_val:0.1884381026029587},{features:[[5,3,3,3,-1.],[5,4,3,1,3.]],threshold:-4.7968099825084209e-003,right_val:0.4736118912696838,left_val:0.6589789986610413},{features:[[9,4,2,3,-1.],[9,5,2,1,3.]],threshold:6.7483168095350266e-003,right_val:0.3356395065784454,left_val:0.5259429812431335},{features:[[0,2,16,3,-1.],[0,3,16,1,3.]],threshold:1.4623369788751006e-003,right_val:0.4264092147350311,left_val:0.5355271100997925},{features:[[15,12,2,8,-1.],[16,12,1,4,2.],[15,16,1,4,2.]],threshold:4.7645159065723419e-003,right_val:0.5786827802658081,left_val:0.5034406781196594},{features:[[3,12,2,8,-1.],[3,12,1,4,2.],[4,16,1,4,2.]],threshold:6.8066660314798355e-003,right_val:0.6677829027175903,left_val:0.4756605029106140},{features:[[14,13,3,6,-1.],[14,15,3,2,3.]],threshold:3.6608621012419462e-003,right_val:0.4311546981334686,left_val:0.5369611978530884},{features:[[3,13,3,6,-1.],[3,15,3,2,3.]],threshold:0.0214496403932571,right_val:0.1888816058635712,left_val:0.4968641996383667},{features:[[6,5,10,2,-1.],[11,5,5,1,2.],[6,6,5,1,2.]],threshold:4.1678901761770248e-003,right_val:0.5815368890762329,left_val:0.4930733144283295},{features:[[2,14,14,6,-1.],[2,17,14,3,2.]],threshold:8.6467564105987549e-003,right_val:0.4132595062255859,left_val:0.5205205082893372},{features:[[10,14,1,3,-1.],[10,15,1,1,3.]],threshold:-3.6114078829996288e-004,right_val:0.4800927937030792,left_val:0.5483555197715759},{features:[[4,16,2,2,-1.],[4,16,1,1,2.],[5,17,1,1,2.]],threshold:1.0808729566633701e-003,right_val:0.6041421294212341,left_val:0.4689902067184448},{features:[[10,6,2,3,-1.],[10,7,2,1,3.]],threshold:5.7719959877431393e-003,right_val:0.3053277134895325,left_val:0.5171142220497131},{features:[[0,17,20,2,-1.],[0,17,10,1,2.],[10,18,10,1,2.]],threshold:1.5720770461484790e-003,right_val:0.4178803861141205,left_val:0.5219978094100952},{features:[[13,6,1,3,-1.],[13,7,1,1,3.]],threshold:-1.9307859474793077e-003,right_val:0.4812920093536377,left_val:0.5860369801521301},{features:[[8,13,3,2,-1.],[9,13,1,2,3.]],threshold:-7.8926272690296173e-003,right_val:0.4971733987331390,left_val:0.1749276965856552},{features:[[12,2,3,3,-1.],[13,2,1,3,3.]],threshold:-2.2224679123610258e-003,right_val:0.5212848186492920,left_val:0.4342589080333710},{features:[[3,18,2,2,-1.],[3,18,1,1,2.],[4,19,1,1,2.]],threshold:1.9011989934369922e-003,right_val:0.6892055273056030,left_val:0.4765186905860901},{features:[[9,16,3,4,-1.],[10,16,1,4,3.]],threshold:2.7576119173318148e-003,right_val:0.4337486028671265,left_val:0.5262191295623779},{features:[[6,6,1,3,-1.],[6,7,1,1,3.]],threshold:5.1787449046969414e-003,right_val:0.7843729257583618,left_val:0.4804069101810455},{features:[[13,1,5,2,-1.],[13,2,5,1,2.]],threshold:-9.0273341629654169e-004,right_val:0.5353423953056335,left_val:0.4120846986770630},{features:[[7,14,6,2,-1.],[7,14,3,1,2.],[10,15,3,1,2.]],threshold:5.1797959022223949e-003,right_val:0.6425960063934326,left_val:0.4740372896194458},{features:[[11,3,3,4,-1.],[12,3,1,4,3.]],threshold:-0.0101140001788735,right_val:0.5175017714500427,left_val:0.2468792051076889},{features:[[1,13,12,6,-1.],[5,13,4,6,3.]],threshold:-0.0186170600354671,right_val:0.4628978967666626,left_val:0.5756294131278992},{features:[[14,11,5,2,-1.],[14,12,5,1,2.]],threshold:5.9225959703326225e-003,right_val:0.3214271068572998,left_val:0.5169625878334045},{features:[[2,15,14,4,-1.],[2,15,7,2,2.],[9,17,7,2,2.]],threshold:-6.2945079989731312e-003,right_val:0.5141636729240418,left_val:0.3872014880180359},{features:[[3,7,14,2,-1.],[10,7,7,1,2.],[3,8,7,1,2.]],threshold:6.5353019163012505e-003,right_val:0.6310489773750305,left_val:0.4853048920631409},{features:[[1,11,4,2,-1.],[1,12,4,1,2.]],threshold:1.0878399480134249e-003,right_val:0.3723258972167969,left_val:0.5117315053939819},{features:[[14,0,6,14,-1.],[16,0,2,14,3.]],threshold:-0.0225422400981188,right_val:0.4887112975120544,left_val:0.5692740082740784},{features:[[4,11,1,3,-1.],[4,12,1,1,3.]],threshold:-3.0065660830587149e-003,right_val:0.5003992915153503,left_val:0.2556012868881226},{features:[[14,0,6,14,-1.],[16,0,2,14,3.]],threshold:7.4741272255778313e-003,right_val:0.5675926804542542,left_val:0.4810872972011566},{features:[[1,10,3,7,-1.],[2,10,1,7,3.]],threshold:0.0261623207479715,right_val:0.1777237057685852,left_val:0.4971194863319397},{features:[[8,12,9,2,-1.],[8,13,9,1,2.]],threshold:9.4352738233283162e-004,right_val:0.5491250753402710,left_val:0.4940010905265808},{features:[[0,6,20,1,-1.],[10,6,10,1,2.]],threshold:0.0333632417023182,right_val:0.2790724039077759,left_val:0.5007612109184265},{features:[[8,4,4,4,-1.],[8,4,2,4,2.]],threshold:-0.0151186501607299,right_val:0.4973031878471375,left_val:0.7059578895568848},{features:[[0,0,2,2,-1.],[0,1,2,1,2.]],threshold:9.8648946732282639e-004,right_val:0.3776761889457703,left_val:0.5128620266914368}],threshold:104.7491989135742200},{simpleClassifiers:[{features:[[5,3,10,9,-1.],[5,6,10,3,3.]],threshold:-0.0951507985591888,right_val:0.4017286896705627,left_val:0.6470757126808167},{features:[[15,2,4,10,-1.],[15,2,2,10,2.]],threshold:6.2702340073883533e-003,right_val:0.5746449232101440,left_val:0.3999822139739990},{features:[[8,2,2,7,-1.],[9,2,1,7,2.]],threshold:3.0018089455552399e-004,right_val:0.5538809895515442,left_val:0.3558770120143890},{features:[[7,4,12,1,-1.],[11,4,4,1,3.]],threshold:1.1757409665733576e-003,right_val:0.5382617712020874,left_val:0.4256534874439240},{features:[[3,4,9,1,-1.],[6,4,3,1,3.]],threshold:4.4235268433112651e-005,right_val:0.5589926838874817,left_val:0.3682908117771149},{features:[[15,10,1,4,-1.],[15,12,1,2,2.]],threshold:-2.9936920327600092e-005,right_val:0.4020367860794067,left_val:0.5452470183372498},{features:[[4,10,6,4,-1.],[7,10,3,4,2.]],threshold:3.0073199886828661e-003,right_val:0.3317843973636627,left_val:0.5239058136940002},{features:[[15,9,1,6,-1.],[15,12,1,3,2.]],threshold:-0.0105138896033168,right_val:0.5307983756065369,left_val:0.4320689141750336},{features:[[7,17,6,3,-1.],[7,18,6,1,3.]],threshold:8.3476826548576355e-003,right_val:0.6453298926353455,left_val:0.4504637122154236},{features:[[14,3,2,16,-1.],[15,3,1,8,2.],[14,11,1,8,2.]],threshold:-3.1492270063608885e-003,right_val:0.5370525121688843,left_val:0.4313425123691559},{features:[[4,9,1,6,-1.],[4,12,1,3,2.]],threshold:-1.4435649973165710e-005,right_val:0.3817971944808960,left_val:0.5326603055000305},{features:[[12,1,5,2,-1.],[12,2,5,1,2.]],threshold:-4.2855090578086674e-004,right_val:0.5382009744644165,left_val:0.4305163919925690},{features:[[6,18,4,2,-1.],[6,18,2,1,2.],[8,19,2,1,2.]],threshold:1.5062429883982986e-004,right_val:0.5544965267181397,left_val:0.4235970973968506},{features:[[2,4,16,10,-1.],[10,4,8,5,2.],[2,9,8,5,2.]],threshold:0.0715598315000534,right_val:0.2678802907466888,left_val:0.5303059816360474},{features:[[6,5,1,10,-1.],[6,10,1,5,2.]],threshold:8.4095180500298738e-004,right_val:0.5205433964729309,left_val:0.3557108938694000},{features:[[4,8,15,2,-1.],[9,8,5,2,3.]],threshold:0.0629865005612373,right_val:0.2861376106739044,left_val:0.5225362777709961},{features:[[1,8,15,2,-1.],[6,8,5,2,3.]],threshold:-3.3798629883676767e-003,right_val:0.5201697945594788,left_val:0.3624185919761658},{features:[[9,5,3,6,-1.],[9,7,3,2,3.]],threshold:-1.1810739670181647e-004,right_val:0.3959893882274628,left_val:0.5474476814270020},{features:[[5,7,8,2,-1.],[9,7,4,2,2.]],threshold:-5.4505601292476058e-004,right_val:0.5215715765953064,left_val:0.3740422129631043},{features:[[9,11,2,3,-1.],[9,12,2,1,3.]],threshold:-1.8454910023137927e-003,right_val:0.4584448933601379,left_val:0.5893052220344544},{features:[[1,0,16,3,-1.],[1,1,16,1,3.]],threshold:-4.3832371011376381e-004,right_val:0.5385351181030273,left_val:0.4084582030773163},{features:[[11,2,7,2,-1.],[11,3,7,1,2.]],threshold:-2.4000830017030239e-003,right_val:0.5293580293655396,left_val:0.3777455091476440},{features:[[5,1,10,18,-1.],[5,7,10,6,3.]],threshold:-0.0987957417964935,right_val:0.5070089101791382,left_val:0.2963612079620361},{features:[[17,4,3,2,-1.],[18,4,1,2,3.]],threshold:3.1798239797353745e-003,right_val:0.6726443767547607,left_val:0.4877632856369019},{features:[[8,13,1,3,-1.],[8,14,1,1,3.]],threshold:3.2406419632025063e-004,right_val:0.5561109781265259,left_val:0.4366911053657532},{features:[[3,14,14,6,-1.],[3,16,14,2,3.]],threshold:-0.0325472503900528,right_val:0.5308616161346436,left_val:0.3128157854080200},{features:[[0,2,3,4,-1.],[1,2,1,4,3.]],threshold:-7.7561130747199059e-003,right_val:0.4639872014522553,left_val:0.6560224890708923},{features:[[12,1,5,2,-1.],[12,2,5,1,2.]],threshold:0.0160272493958473,right_val:0.3141897916793823,left_val:0.5172680020332336},{features:[[3,1,5,2,-1.],[3,2,5,1,2.]],threshold:7.1002350523485802e-006,right_val:0.5336294770240784,left_val:0.4084446132183075},{features:[[10,13,2,3,-1.],[10,14,2,1,3.]],threshold:7.3422808200120926e-003,right_val:0.6603465080261231,left_val:0.4966922104358673},{features:[[8,13,2,3,-1.],[8,14,2,1,3.]],threshold:-1.6970280557870865e-003,right_val:0.4500182867050171,left_val:0.5908237099647522},{features:[[14,12,2,3,-1.],[14,13,2,1,3.]],threshold:2.4118260480463505e-003,right_val:0.3599720895290375,left_val:0.5315160751342773},{features:[[7,2,2,3,-1.],[7,3,2,1,3.]],threshold:-5.5300937965512276e-003,right_val:0.4996814131736755,left_val:0.2334040999412537},{features:[[5,6,10,4,-1.],[10,6,5,2,2.],[5,8,5,2,2.]],threshold:-2.6478730142116547e-003,right_val:0.4684734046459198,left_val:0.5880935788154602},{features:[[9,13,1,6,-1.],[9,16,1,3,2.]],threshold:0.0112956296652555,right_val:0.1884590983390808,left_val:0.4983777105808258},{features:[[10,12,2,2,-1.],[11,12,1,1,2.],[10,13,1,1,2.]],threshold:-6.6952878842130303e-004,right_val:0.4799019992351532,left_val:0.5872138142585754},{features:[[4,12,2,3,-1.],[4,13,2,1,3.]],threshold:1.4410680159926414e-003,right_val:0.3501011133193970,left_val:0.5131189227104187},{features:[[14,4,6,6,-1.],[14,6,6,2,3.]],threshold:2.4637870956212282e-003,right_val:0.4117639064788818,left_val:0.5339372158050537},{features:[[8,17,2,3,-1.],[8,18,2,1,3.]],threshold:3.3114518737420440e-004,right_val:0.5398246049880981,left_val:0.4313383102416992},{features:[[16,4,4,6,-1.],[16,6,4,2,3.]],threshold:-0.0335572697222233,right_val:0.5179154872894287,left_val:0.2675336897373200},{features:[[0,4,4,6,-1.],[0,6,4,2,3.]],threshold:0.0185394193977118,right_val:0.2317177057266235,left_val:0.4973869919776917},{features:[[14,6,2,3,-1.],[14,6,1,3,2.]],threshold:-2.9698139405809343e-004,right_val:0.4643664062023163,left_val:0.5529708266258240},{features:[[4,9,8,1,-1.],[8,9,4,1,2.]],threshold:-4.5577259152196348e-004,right_val:0.4469191133975983,left_val:0.5629584193229675},{features:[[8,12,4,3,-1.],[8,13,4,1,3.]],threshold:-0.0101589802652597,right_val:0.4925918877124786,left_val:0.6706212759017944},{features:[[5,12,10,6,-1.],[5,14,10,2,3.]],threshold:-2.2413829356082715e-005,right_val:0.3912901878356934,left_val:0.5239421725273132},{features:[[11,12,1,2,-1.],[11,13,1,1,2.]],threshold:7.2034963523037732e-005,right_val:0.5501788854598999,left_val:0.4799438118934631},{features:[[8,15,4,2,-1.],[8,16,4,1,2.]],threshold:-6.9267209619283676e-003,right_val:0.4698084890842438,left_val:0.6930009722709656},{features:[[6,9,8,8,-1.],[10,9,4,4,2.],[6,13,4,4,2.]],threshold:-7.6997838914394379e-003,right_val:0.5480883121490479,left_val:0.4099623858928680},{features:[[7,12,4,6,-1.],[7,12,2,3,2.],[9,15,2,3,2.]],threshold:-7.3130549862980843e-003,right_val:0.5057886242866516,left_val:0.3283475935459137},{features:[[10,11,3,1,-1.],[11,11,1,1,3.]],threshold:1.9650589674711227e-003,right_val:0.6398249864578247,left_val:0.4978047013282776},{features:[[9,7,2,10,-1.],[9,7,1,5,2.],[10,12,1,5,2.]],threshold:7.1647600270807743e-003,right_val:0.6222137212753296,left_val:0.4661160111427307},{features:[[8,0,6,6,-1.],[10,0,2,6,3.]],threshold:-0.0240786392241716,right_val:0.5222162008285523,left_val:0.2334644943475723},{features:[[3,11,2,6,-1.],[3,13,2,2,3.]],threshold:-0.0210279691964388,right_val:0.4938226044178009,left_val:0.1183653995394707},{features:[[16,12,1,2,-1.],[16,13,1,1,2.]],threshold:3.6017020465806127e-004,right_val:0.4116711020469666,left_val:0.5325019955635071},{features:[[1,14,6,6,-1.],[1,14,3,3,2.],[4,17,3,3,2.]],threshold:-0.0172197297215462,right_val:0.4664269089698792,left_val:0.6278762221336365},{features:[[13,1,3,6,-1.],[14,1,1,6,3.]],threshold:-7.8672142699360847e-003,right_val:0.5249736905097961,left_val:0.3403415083885193},{features:[[8,8,2,2,-1.],[8,9,2,1,2.]],threshold:-4.4777389848604798e-004,right_val:0.5086259245872498,left_val:0.3610411882400513},{features:[[9,9,3,3,-1.],[10,9,1,3,3.]],threshold:5.5486010387539864e-003,right_val:0.6203498244285584,left_val:0.4884265959262848},{features:[[8,7,3,3,-1.],[8,8,3,1,3.]],threshold:-6.9461148232221603e-003,right_val:0.5011097192764282,left_val:0.2625930011272430},{features:[[14,0,2,3,-1.],[14,0,1,3,2.]],threshold:1.3569870498031378e-004,right_val:0.5628312230110169,left_val:0.4340794980525971},{features:[[1,0,18,9,-1.],[7,0,6,9,3.]],threshold:-0.0458802506327629,right_val:0.4696274995803833,left_val:0.6507998704910278},{features:[[11,5,4,15,-1.],[11,5,2,15,2.]],threshold:-0.0215825606137514,right_val:0.5287616848945618,left_val:0.3826502859592438},{features:[[5,5,4,15,-1.],[7,5,2,15,2.]],threshold:-0.0202095396816731,right_val:0.5074477195739746,left_val:0.3233368098735809},{features:[[14,0,2,3,-1.],[14,0,1,3,2.]],threshold:5.8496710844337940e-003,right_val:0.4489670991897583,left_val:0.5177603960037231},{features:[[4,0,2,3,-1.],[5,0,1,3,2.]],threshold:-5.7476379879517481e-005,right_val:0.5246363878250122,left_val:0.4020850956439972},{features:[[11,12,2,2,-1.],[12,12,1,1,2.],[11,13,1,1,2.]],threshold:-1.1513100471347570e-003,right_val:0.4905154109001160,left_val:0.6315072178840637},{features:[[7,12,2,2,-1.],[7,12,1,1,2.],[8,13,1,1,2.]],threshold:1.9862831104546785e-003,right_val:0.6497151255607605,left_val:0.4702459871768951},{features:[[12,0,3,4,-1.],[13,0,1,4,3.]],threshold:-5.2719512023031712e-003,right_val:0.5227652788162231,left_val:0.3650383949279785},{features:[[4,11,3,3,-1.],[4,12,3,1,3.]],threshold:1.2662699446082115e-003,right_val:0.3877618014812470,left_val:0.5166100859642029},{features:[[12,7,4,2,-1.],[12,8,4,1,2.]],threshold:-6.2919440679252148e-003,right_val:0.5023847818374634,left_val:0.7375894188880920},{features:[[8,10,3,2,-1.],[9,10,1,2,3.]],threshold:6.7360111279413104e-004,right_val:0.5495585799217224,left_val:0.4423226118087769},{features:[[9,9,3,2,-1.],[10,9,1,2,3.]],threshold:-1.0523450328037143e-003,right_val:0.4859583079814911,left_val:0.5976396203041077},{features:[[8,9,3,2,-1.],[9,9,1,2,3.]],threshold:-4.4216238893568516e-004,right_val:0.4398930966854096,left_val:0.5955939292907715},{features:[[12,0,3,4,-1.],[13,0,1,4,3.]],threshold:1.1747940443456173e-003,right_val:0.4605058133602142,left_val:0.5349888205528259},{features:[[5,0,3,4,-1.],[6,0,1,4,3.]],threshold:5.2457437850534916e-003,right_val:0.2941577136516571,left_val:0.5049191117286682},{features:[[4,14,12,4,-1.],[10,14,6,2,2.],[4,16,6,2,2.]],threshold:-0.0245397202670574,right_val:0.5218586921691895,left_val:0.2550177872180939},{features:[[8,13,2,3,-1.],[8,14,2,1,3.]],threshold:7.3793041519820690e-004,right_val:0.5490816235542297,left_val:0.4424861073493958},{features:[[10,10,3,8,-1.],[10,14,3,4,2.]],threshold:1.4233799884095788e-003,right_val:0.4081355929374695,left_val:0.5319514274597168},{features:[[8,10,4,8,-1.],[8,10,2,4,2.],[10,14,2,4,2.]],threshold:-2.4149110540747643e-003,right_val:0.5238950252532959,left_val:0.4087659120559692},{features:[[10,8,3,1,-1.],[11,8,1,1,3.]],threshold:-1.2165299849584699e-003,right_val:0.4908052980899811,left_val:0.5674579143524170},{features:[[9,12,1,6,-1.],[9,15,1,3,2.]],threshold:-1.2438809499144554e-003,right_val:0.5256118178367615,left_val:0.4129425883293152},{features:[[10,8,3,1,-1.],[11,8,1,1,3.]],threshold:6.1942739412188530e-003,right_val:0.7313653230667114,left_val:0.5060194134712219},{features:[[7,8,3,1,-1.],[8,8,1,1,3.]],threshold:-1.6607169527560472e-003,right_val:0.4596369862556458,left_val:0.5979632139205933},{features:[[5,2,15,14,-1.],[5,9,15,7,2.]],threshold:-0.0273162592202425,right_val:0.5308842062950134,left_val:0.4174365103244782},{features:[[2,1,2,10,-1.],[2,1,1,5,2.],[3,6,1,5,2.]],threshold:-1.5845570014789701e-003,right_val:0.4519486129283905,left_val:0.5615804791450501},{features:[[14,14,2,3,-1.],[14,15,2,1,3.]],threshold:-1.5514739789068699e-003,right_val:0.5360785126686096,left_val:0.4076187014579773},{features:[[2,7,3,3,-1.],[3,7,1,3,3.]],threshold:3.8446558755822480e-004,right_val:0.5430442094802856,left_val:0.4347293972969055},{features:[[17,4,3,3,-1.],[17,5,3,1,3.]],threshold:-0.0146722598001361,right_val:0.5146093964576721,left_val:0.1659304946660996},{features:[[0,4,3,3,-1.],[0,5,3,1,3.]],threshold:8.1608882173895836e-003,right_val:0.1884745955467224,left_val:0.4961819052696228},{features:[[13,5,6,2,-1.],[16,5,3,1,2.],[13,6,3,1,2.]],threshold:1.1121659772470593e-003,right_val:0.6093816161155701,left_val:0.4868263900279999},{features:[[4,19,12,1,-1.],[8,19,4,1,3.]],threshold:-7.2603770531713963e-003,right_val:0.4690375924110413,left_val:0.6284325122833252},{features:[[12,12,2,4,-1.],[12,14,2,2,2.]],threshold:-2.4046430189628154e-004,right_val:0.4046044051647186,left_val:0.5575000047683716},{features:[[3,15,1,3,-1.],[3,16,1,1,3.]],threshold:-2.3348190006799996e-004,right_val:0.5252848267555237,left_val:0.4115762114524841},{features:[[11,16,6,4,-1.],[11,16,3,4,2.]],threshold:5.5736480280756950e-003,right_val:0.5690100789070129,left_val:0.4730072915554047},{features:[[2,10,3,10,-1.],[3,10,1,10,3.]],threshold:0.0306237693876028,right_val:0.1740095019340515,left_val:0.4971886873245239},{features:[[12,8,2,4,-1.],[12,8,1,4,2.]],threshold:9.2074798885732889e-004,right_val:0.4354872107505798,left_val:0.5372117757797241},{features:[[6,8,2,4,-1.],[7,8,1,4,2.]],threshold:-4.3550739064812660e-005,right_val:0.4347316920757294,left_val:0.5366883873939514},{features:[[10,14,2,3,-1.],[10,14,1,3,2.]],threshold:-6.6452710889279842e-003,right_val:0.5160533189773560,left_val:0.3435518145561218},{features:[[5,1,10,3,-1.],[10,1,5,3,2.]],threshold:0.0432219989597797,right_val:0.7293652892112732,left_val:0.4766792058944702},{features:[[10,7,3,2,-1.],[11,7,1,2,3.]],threshold:2.2331769578158855e-003,right_val:0.5633171200752258,left_val:0.5029315948486328},{features:[[5,6,9,2,-1.],[8,6,3,2,3.]],threshold:3.1829739455133677e-003,right_val:0.5192136764526367,left_val:0.4016092121601105},{features:[[9,8,2,2,-1.],[9,9,2,1,2.]],threshold:-1.8027749320026487e-004,right_val:0.5417919754981995,left_val:0.4088315963745117},{features:[[2,11,16,6,-1.],[2,11,8,3,2.],[10,14,8,3,2.]],threshold:-5.2934689447283745e-003,right_val:0.5243561863899231,left_val:0.4075677096843720},{features:[[12,7,2,2,-1.],[13,7,1,1,2.],[12,8,1,1,2.]],threshold:1.2750959722325206e-003,right_val:0.6387010812759399,left_val:0.4913282990455627},{features:[[9,5,2,3,-1.],[9,6,2,1,3.]],threshold:4.3385322205722332e-003,right_val:0.2947346866130829,left_val:0.5031672120094299},{features:[[9,7,3,2,-1.],[10,7,1,2,3.]],threshold:8.5250744596123695e-003,right_val:0.6308869123458862,left_val:0.4949789047241211},{features:[[5,1,8,12,-1.],[5,7,8,6,2.]],threshold:-9.4266352243721485e-004,right_val:0.4285649955272675,left_val:0.5328366756439209},{features:[[13,5,2,2,-1.],[13,6,2,1,2.]],threshold:1.3609660090878606e-003,right_val:0.5941501259803772,left_val:0.4991525113582611},{features:[[5,5,2,2,-1.],[5,6,2,1,2.]],threshold:4.4782509212382138e-004,right_val:0.5854480862617493,left_val:0.4573504030704498},{features:[[12,4,3,3,-1.],[12,5,3,1,3.]],threshold:1.3360050506889820e-003,right_val:0.5849052071571350,left_val:0.4604358971118927},{features:[[4,14,2,3,-1.],[4,15,2,1,3.]],threshold:-6.0967548051849008e-004,right_val:0.5229423046112061,left_val:0.3969388902187347},{features:[[12,4,3,3,-1.],[12,5,3,1,3.]],threshold:-2.3656780831515789e-003,right_val:0.4898357093334198,left_val:0.5808320045471191},{features:[[5,4,3,3,-1.],[5,5,3,1,3.]],threshold:1.0734340175986290e-003,right_val:0.5470039248466492,left_val:0.4351210892200470},{features:[[9,14,2,6,-1.],[10,14,1,3,2.],[9,17,1,3,2.]],threshold:2.1923359017819166e-003,right_val:0.3842903971672058,left_val:0.5355060100555420},{features:[[8,14,3,2,-1.],[9,14,1,2,3.]],threshold:5.4968618787825108e-003,right_val:0.2827191948890686,left_val:0.5018138885498047},{features:[[9,5,6,6,-1.],[11,5,2,6,3.]],threshold:-0.0753688216209412,right_val:0.5148826837539673,left_val:0.1225076019763947},{features:[[5,5,6,6,-1.],[7,5,2,6,3.]],threshold:0.0251344703137875,right_val:0.7025446295738220,left_val:0.4731766879558563},{features:[[13,13,1,2,-1.],[13,14,1,1,2.]],threshold:-2.9358599931583740e-005,right_val:0.4656086862087250,left_val:0.5430532097816467},{features:[[0,2,10,2,-1.],[0,3,10,1,2.]],threshold:-5.8355910005047917e-004,right_val:0.5190119743347168,left_val:0.4031040072441101},{features:[[13,13,1,2,-1.],[13,14,1,1,2.]],threshold:-2.6639450807124376e-003,right_val:0.5161771178245544,left_val:0.4308126866817474},{features:[[5,7,2,2,-1.],[5,7,1,1,2.],[6,8,1,1,2.]],threshold:-1.3804089976474643e-003,right_val:0.4695515930652618,left_val:0.6219829916954041},{features:[[13,5,2,7,-1.],[13,5,1,7,2.]],threshold:1.2313219485804439e-003,right_val:0.4425831139087677,left_val:0.5379363894462585},{features:[[6,13,1,2,-1.],[6,14,1,1,2.]],threshold:-1.4644179827882908e-005,right_val:0.4222503006458283,left_val:0.5281640291213989},{features:[[11,0,3,7,-1.],[12,0,1,7,3.]],threshold:-0.0128188095986843,right_val:0.5179932713508606,left_val:0.2582092881202698},{features:[[0,3,2,16,-1.],[0,3,1,8,2.],[1,11,1,8,2.]],threshold:0.0228521898388863,right_val:0.7609264254570007,left_val:0.4778693020343781},{features:[[11,0,3,7,-1.],[12,0,1,7,3.]],threshold:8.2305970136076212e-004,right_val:0.4671724140644074,left_val:0.5340992212295532},{features:[[6,0,3,7,-1.],[7,0,1,7,3.]],threshold:0.0127701200544834,right_val:0.1472366005182266,left_val:0.4965761005878449},{features:[[11,16,8,4,-1.],[11,16,4,4,2.]],threshold:-0.0500515103340149,right_val:0.5016592144966126,left_val:0.6414994001388550},{features:[[1,16,8,4,-1.],[5,16,4,4,2.]],threshold:0.0157752707600594,right_val:0.5685362219810486,left_val:0.4522320032119751},{features:[[13,5,2,7,-1.],[13,5,1,7,2.]],threshold:-0.0185016207396984,right_val:0.5137959122657776,left_val:0.2764748930931091},{features:[[5,5,2,7,-1.],[6,5,1,7,2.]],threshold:2.4626250378787518e-003,right_val:0.3795408010482788,left_val:0.5141941905021668},{features:[[18,6,2,14,-1.],[18,13,2,7,2.]],threshold:0.0629161670804024,right_val:0.6580433845520020,left_val:0.5060648918151856},{features:[[6,10,3,4,-1.],[6,12,3,2,2.]],threshold:-2.1648500478477217e-005,right_val:0.4019886851310730,left_val:0.5195388197898865},{features:[[14,7,1,2,-1.],[14,8,1,1,2.]],threshold:2.1180990152060986e-003,right_val:0.5954458713531494,left_val:0.4962365031242371},{features:[[0,1,18,6,-1.],[0,1,9,3,2.],[9,4,9,3,2.]],threshold:-0.0166348908096552,right_val:0.5175446867942810,left_val:0.3757933080196381},{features:[[14,7,1,2,-1.],[14,8,1,1,2.]],threshold:-2.8899470344185829e-003,right_val:0.5057178735733032,left_val:0.6624013781547546},{features:[[0,6,2,14,-1.],[0,13,2,7,2.]],threshold:0.0767832621932030,right_val:0.8047714829444885,left_val:0.4795796871185303},{features:[[17,0,3,12,-1.],[18,0,1,12,3.]],threshold:3.9170677773654461e-003,right_val:0.5719941854476929,left_val:0.4937882125377655},{features:[[0,6,18,3,-1.],[0,7,18,1,3.]],threshold:-0.0726706013083458,right_val:0.4943903982639313,left_val:0.0538945607841015},{features:[[6,0,14,16,-1.],[6,8,14,8,2.]],threshold:0.5403950214385986,right_val:0.1143338978290558,left_val:0.5129774212837219},{features:[[0,0,3,12,-1.],[1,0,1,12,3.]],threshold:2.9510019812732935e-003,right_val:0.5698574185371399,left_val:0.4528343975543976},{features:[[13,0,3,7,-1.],[14,0,1,7,3.]],threshold:3.4508369863033295e-003,right_val:0.4218730926513672,left_val:0.5357726812362671},{features:[[5,7,1,2,-1.],[5,8,1,1,2.]],threshold:-4.2077939724549651e-004,right_val:0.4637925922870636,left_val:0.5916172862052918},{features:[[14,4,6,6,-1.],[14,6,6,2,3.]],threshold:3.3051050268113613e-003,right_val:0.4382042884826660,left_val:0.5273385047912598},{features:[[5,7,7,2,-1.],[5,8,7,1,2.]],threshold:4.7735060798004270e-004,right_val:0.5181884765625000,left_val:0.4046528041362763},{features:[[8,6,6,9,-1.],[8,9,6,3,3.]],threshold:-0.0259285103529692,right_val:0.5089386105537415,left_val:0.7452235817909241},{features:[[5,4,6,1,-1.],[7,4,2,1,3.]],threshold:-2.9729790985584259e-003,right_val:0.5058795213699341,left_val:0.3295435905456543},{features:[[13,0,6,4,-1.],[16,0,3,2,2.],[13,2,3,2,2.]],threshold:5.8508329093456268e-003,right_val:0.5793024897575378,left_val:0.4857144057750702},{features:[[1,2,18,12,-1.],[1,6,18,4,3.]],threshold:-0.0459675192832947,right_val:0.5380653142929077,left_val:0.4312731027603149},{features:[[3,2,17,12,-1.],[3,6,17,4,3.]],threshold:0.1558596044778824,right_val:0.1684713959693909,left_val:0.5196170210838318},{features:[[5,14,7,3,-1.],[5,15,7,1,3.]],threshold:0.0151648297905922,right_val:0.6735026836395264,left_val:0.4735757112503052},{features:[[10,14,1,3,-1.],[10,15,1,1,3.]],threshold:-1.0604249546304345e-003,right_val:0.4775702953338623,left_val:0.5822926759719849},{features:[[3,14,3,3,-1.],[3,15,3,1,3.]],threshold:6.6476291976869106e-003,right_val:0.2319535017013550,left_val:0.4999198913574219},{features:[[14,4,6,6,-1.],[14,6,6,2,3.]],threshold:-0.0122311301529408,right_val:0.5262982249259949,left_val:0.4750893115997315},{features:[[0,4,6,6,-1.],[0,6,6,2,3.]],threshold:5.6528882123529911e-003,right_val:0.3561818897724152,left_val:0.5069767832756043},{features:[[12,5,4,3,-1.],[12,6,4,1,3.]],threshold:1.2977829901501536e-003,right_val:0.5619062781333923,left_val:0.4875693917274475},{features:[[4,5,4,3,-1.],[4,6,4,1,3.]],threshold:0.0107815898954868,right_val:0.6782308220863342,left_val:0.4750770032405853},{features:[[18,0,2,6,-1.],[18,2,2,2,3.]],threshold:2.8654779307544231e-003,right_val:0.4290736019611359,left_val:0.5305461883544922},{features:[[8,1,4,9,-1.],[10,1,2,9,2.]],threshold:2.8663428965955973e-003,right_val:0.5539351105690002,left_val:0.4518479108810425},{features:[[6,6,8,2,-1.],[6,6,4,2,2.]],threshold:-5.1983320154249668e-003,right_val:0.5434188842773438,left_val:0.4149119853973389},{features:[[6,5,4,2,-1.],[6,5,2,1,2.],[8,6,2,1,2.]],threshold:5.3739990107715130e-003,right_val:0.6507657170295715,left_val:0.4717896878719330},{features:[[10,5,2,3,-1.],[10,6,2,1,3.]],threshold:-0.0146415298804641,right_val:0.5161777138710022,left_val:0.2172164022922516},{features:[[9,5,1,3,-1.],[9,6,1,1,3.]],threshold:-1.5042580344015732e-005,right_val:0.4298836886882782,left_val:0.5337383747100830},{features:[[9,10,2,2,-1.],[9,11,2,1,2.]],threshold:-1.1875660129589960e-004,right_val:0.5582447052001953,left_val:0.4604594111442566},{features:[[0,8,4,3,-1.],[0,9,4,1,3.]],threshold:0.0169955305755138,right_val:0.0738800764083862,left_val:0.4945895075798035},{features:[[6,0,8,6,-1.],[6,3,8,3,2.]],threshold:-0.0350959412753582,right_val:0.4977591037750244,left_val:0.7005509138107300},{features:[[1,0,6,4,-1.],[1,0,3,2,2.],[4,2,3,2,2.]],threshold:2.4217350874096155e-003,right_val:0.5477694272994995,left_val:0.4466265141963959},{features:[[13,0,3,7,-1.],[14,0,1,7,3.]],threshold:-9.6340337768197060e-004,right_val:0.5313338041305542,left_val:0.4714098870754242},{features:[[9,16,2,2,-1.],[9,17,2,1,2.]],threshold:1.6391130338888615e-004,right_val:0.5342242121696472,left_val:0.4331546127796173},{features:[[11,4,6,10,-1.],[11,9,6,5,2.]],threshold:-0.0211414601653814,right_val:0.5204498767852783,left_val:0.2644700109958649},{features:[[0,10,19,2,-1.],[0,11,19,1,2.]],threshold:8.7775202700868249e-004,right_val:0.4152742922306061,left_val:0.5208349823951721},{features:[[9,5,8,9,-1.],[9,8,8,3,3.]],threshold:-0.0279439203441143,right_val:0.5018811821937561,left_val:0.6344125270843506},{features:[[4,0,3,7,-1.],[5,0,1,7,3.]],threshold:6.7297378554940224e-003,right_val:0.3500863909721375,left_val:0.5050438046455383},{features:[[8,6,4,12,-1.],[10,6,2,6,2.],[8,12,2,6,2.]],threshold:0.0232810396701097,right_val:0.6968677043914795,left_val:0.4966318011283875},{features:[[0,2,6,4,-1.],[0,4,6,2,2.]],threshold:-0.0116449799388647,right_val:0.5049629807472229,left_val:0.3300260007381439},{features:[[8,15,4,3,-1.],[8,16,4,1,3.]],threshold:0.0157643090933561,right_val:0.7321153879165649,left_val:0.4991598129272461},{features:[[8,0,3,7,-1.],[9,0,1,7,3.]],threshold:-1.3611479662358761e-003,right_val:0.5160670876502991,left_val:0.3911735117435455},{features:[[9,5,3,4,-1.],[10,5,1,4,3.]],threshold:-8.1522337859496474e-004,right_val:0.4949719011783600,left_val:0.5628911256790161},{features:[[8,5,3,4,-1.],[9,5,1,4,3.]],threshold:-6.0066272271797061e-004,right_val:0.4550595879554749,left_val:0.5853595137596130},{features:[[7,6,6,1,-1.],[9,6,2,1,3.]],threshold:4.9715518252924085e-004,right_val:0.5443599224090576,left_val:0.4271470010280609},{features:[[7,14,4,4,-1.],[7,14,2,2,2.],[9,16,2,2,2.]],threshold:2.3475370835512877e-003,right_val:0.3887656927108765,left_val:0.5143110752105713},{features:[[13,14,4,6,-1.],[15,14,2,3,2.],[13,17,2,3,2.]],threshold:-8.9261569082736969e-003,right_val:0.4971720874309540,left_val:0.6044502258300781},{features:[[7,8,1,8,-1.],[7,12,1,4,2.]],threshold:-0.0139199104160070,right_val:0.5000367760658264,left_val:0.2583160996437073},{features:[[16,0,2,8,-1.],[17,0,1,4,2.],[16,4,1,4,2.]],threshold:1.0209949687123299e-003,right_val:0.5560358166694641,left_val:0.4857374131679535},{features:[[2,0,2,8,-1.],[2,0,1,4,2.],[3,4,1,4,2.]],threshold:-2.7441629208624363e-003,right_val:0.4645777046680450,left_val:0.5936884880065918},{features:[[6,1,14,3,-1.],[6,2,14,1,3.]],threshold:-0.0162001308053732,right_val:0.5193495154380798,left_val:0.3163014948368073},{features:[[7,9,3,10,-1.],[7,14,3,5,2.]],threshold:4.3331980705261230e-003,right_val:0.3458878993988037,left_val:0.5061224102973938},{features:[[9,14,2,2,-1.],[9,15,2,1,2.]],threshold:5.8497930876910686e-004,right_val:0.5870177745819092,left_val:0.4779017865657806},{features:[[7,7,6,8,-1.],[7,11,6,4,2.]],threshold:-2.2466450463980436e-003,right_val:0.5374773144721985,left_val:0.4297851026058197},{features:[[9,7,3,6,-1.],[9,10,3,3,2.]],threshold:2.3146099410951138e-003,right_val:0.4640969932079315,left_val:0.5438671708106995},{features:[[7,13,3,3,-1.],[7,14,3,1,3.]],threshold:8.7679121643304825e-003,right_val:0.6771789789199829,left_val:0.4726893007755280},{features:[[9,9,2,2,-1.],[9,10,2,1,2.]],threshold:-2.2448020172305405e-004,right_val:0.5428048968315125,left_val:0.4229173064231873},{features:[[0,1,18,2,-1.],[6,1,6,2,3.]],threshold:-7.4336021207273006e-003,right_val:0.4683673977851868,left_val:0.6098880767822266},{features:[[7,1,6,14,-1.],[7,8,6,7,2.]],threshold:-2.3189240600913763e-003,right_val:0.4424242079257965,left_val:0.5689436793327332},{features:[[1,9,18,1,-1.],[7,9,6,1,3.]],threshold:-2.1042178850620985e-003,right_val:0.5187087059020996,left_val:0.3762221038341522},{features:[[9,7,2,2,-1.],[9,7,1,2,2.]],threshold:4.6034841216169298e-004,right_val:0.5771207213401794,left_val:0.4699405133724213},{features:[[9,3,2,9,-1.],[10,3,1,9,2.]],threshold:1.0547629790380597e-003,right_val:0.5601701736450195,left_val:0.4465216994285584},{features:[[18,14,2,3,-1.],[18,15,2,1,3.]],threshold:8.7148818420246243e-004,right_val:0.3914709091186523,left_val:0.5449805259704590},{features:[[7,11,3,1,-1.],[8,11,1,1,3.]],threshold:3.3364820410497487e-004,right_val:0.5645738840103149,left_val:0.4564009010791779},{features:[[10,8,3,4,-1.],[11,8,1,4,3.]],threshold:-1.4853250468149781e-003,right_val:0.4692778885364533,left_val:0.5747377872467041},{features:[[7,14,3,6,-1.],[8,14,1,6,3.]],threshold:3.0251620337367058e-003,right_val:0.3762814104557037,left_val:0.5166196823120117},{features:[[10,8,3,4,-1.],[11,8,1,4,3.]],threshold:5.0280741415917873e-003,right_val:0.6151527166366577,left_val:0.5002111792564392},{features:[[7,8,3,4,-1.],[8,8,1,4,3.]],threshold:-5.8164511574432254e-004,right_val:0.4390751123428345,left_val:0.5394598245620728},{features:[[7,9,6,9,-1.],[7,12,6,3,3.]],threshold:0.0451415292918682,right_val:0.2063035964965820,left_val:0.5188326835632324},{features:[[0,14,2,3,-1.],[0,15,2,1,3.]],threshold:-1.0795620037242770e-003,right_val:0.5137907266616821,left_val:0.3904685080051422},{features:[[11,12,1,2,-1.],[11,13,1,1,2.]],threshold:1.5995999274309725e-004,right_val:0.5427504181861877,left_val:0.4895322918891907},{features:[[4,3,8,3,-1.],[8,3,4,3,2.]],threshold:-0.0193592701107264,right_val:0.4773507118225098,left_val:0.6975228786468506},{features:[[0,4,20,6,-1.],[0,4,10,6,2.]],threshold:0.2072550952434540,right_val:0.3034991919994354,left_val:0.5233635902404785},{features:[[9,14,1,3,-1.],[9,15,1,1,3.]],threshold:-4.1953290929086506e-004,right_val:0.4460186064243317,left_val:0.5419396758079529},{features:[[8,14,4,3,-1.],[8,15,4,1,3.]],threshold:2.2582069505006075e-003,right_val:0.6027408838272095,left_val:0.4815764129161835},{features:[[0,15,14,4,-1.],[0,17,14,2,2.]],threshold:-6.7811207845807076e-003,right_val:0.5183305740356445,left_val:0.3980278968811035},{features:[[1,14,18,6,-1.],[1,17,18,3,2.]],threshold:0.0111543098464608,right_val:0.4188759922981262,left_val:0.5431231856346130},{features:[[0,0,10,6,-1.],[0,0,5,3,2.],[5,3,5,3,2.]],threshold:0.0431624315679073,right_val:0.6522961258888245,left_val:0.4738228023052216}],threshold:105.7611007690429700}],size:[20,20],tilted:false};
})(jsfeat.haar);
