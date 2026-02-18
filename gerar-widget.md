Agora tenho um fluxo que roda o agente em um site. Gostaria de criar um código JS que coloca o codigo html. Vou enviar um codigo html do padrao como tem que ser, a diferenca que ele precisa enviar o nome do agente para que eu dentro do fluxo consiga identificar. Esse é o html que uso. Se conseguir deixe ele personalizavel. Mudando textos estáticos e cores padrão.

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>Chat Widget - Oráculo Marketing</title>
</head>
<body>
    <!-- This will be moved to body by script -->
    <div id="chat-widget-wrapper">
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                -webkit-tap-highlight-color: transparent;
            }

            /* Chat Button */
            #chat-widget-wrapper .chat-button {
                position: fixed !important;
                bottom: 20px !important;
                right: 20px !important;
                top: auto !important;
                left: auto !important;
                width: 56px;
                height: 56px;
                border-radius: 16px;
                background: #0F172A;
                border: none;
                cursor: pointer;
                box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12);
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                z-index: 2147483647 !important;
                touch-action: manipulation;
                transform: translate(0, 0) !important;
                margin: 0 !important;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            }

            /* Hide chat button when container is active on mobile */
            @media (max-width: 480px) {
                #chat-widget-wrapper .chat-button.active {
                    display: none !important;
                }
            }

            #chat-widget-wrapper .chat-button:hover {
                transform: translateY(-2px) !important;
                box-shadow: 0 8px 24px rgba(15, 23, 42, 0.16);
            }

            #chat-widget-wrapper .chat-button:active {
                transform: translateY(0) !important;
            }

            #chat-widget-wrapper .chat-button svg {
                width: 24px;
                height: 24px;
                stroke: white;
                fill: none;
                stroke-width: 2;
            }

            #chat-widget-wrapper .chat-button .icon-chat {
                display: block;
            }

            #chat-widget-wrapper .chat-button .icon-close {
                display: none;
            }

            #chat-widget-wrapper .chat-button.active .icon-chat {
                display: none;
            }

            #chat-widget-wrapper .chat-button.active .icon-close {
                display: block;
            }

            /* Chat Container - Desktop */
            #chat-widget-wrapper .chat-container {
                position: fixed !important;
                bottom: 88px !important;
                right: 20px !important;
                top: auto !important;
                left: auto !important;
                width: 400px;
                max-width: calc(100vw - 40px);
                height: 600px;
                max-height: calc(100vh - 120px);
                background: white;
                border-radius: 16px;
                box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.04),
                            0 8px 32px rgba(0, 0, 0, 0.08);
                display: none;
                flex-direction: column;
                overflow: hidden;
                z-index: 2147483646 !important;
                animation: slideUp 0.3s ease;
                transform: translate(0, 0) !important;
                margin: 0 !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            }

            #chat-widget-wrapper .chat-container.active {
                display: flex;
            }

            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(16px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            /* Consent Screen */
            #chat-widget-wrapper .consent-screen {
                display: flex;
                flex-direction: column;
                height: 100%;
                background: white;
            }

            #chat-widget-wrapper .consent-screen.hidden {
                display: none;
            }

            #chat-widget-wrapper .consent-header {
                background: white;
                padding: 20px;
                border-bottom: 1px solid #F1F5F9;
                flex-shrink: 0;
            }

            #chat-widget-wrapper .consent-header h3 {
                font-size: 18px;
                font-weight: 600;
                color: #0F172A;
                margin-bottom: 8px;
            }

            #chat-widget-wrapper .consent-header p {
                font-size: 14px;
                color: #64748B;
                line-height: 1.5;
            }

            #chat-widget-wrapper .consent-content {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
                background: #FAFAFA;
            }

            #chat-widget-wrapper .consent-text {
                background: white;
                padding: 20px;
                border-radius: 12px;
                border: 1px solid #E2E8F0;
                font-size: 14px;
                line-height: 1.7;
                color: #1E293B;
            }

            #chat-widget-wrapper .consent-link {
                color: #0F172A;
                font-weight: 600;
                text-decoration: underline;
                transition: all 0.2s;
            }

            #chat-widget-wrapper .consent-link:hover {
                color: #1E293B;
                text-decoration: none;
            }

            #chat-widget-wrapper .consent-footer {
                padding: 20px;
                background: white;
                border-top: 1px solid #F1F5F9;
                flex-shrink: 0;
            }

            #chat-widget-wrapper .chat-consent-checkbox-wrapper {
                display: flex !important;
                align-items: flex-start !important;
                gap: 12px !important;
                margin-bottom: 16px !important;
                cursor: pointer !important;
            }

            #chat-widget-wrapper .chat-consent-checkbox-input {
                -webkit-appearance: checkbox !important;
                -moz-appearance: checkbox !important;
                appearance: checkbox !important;
                width: 20px !important;
                height: 20px !important;
                margin: 2px 0 0 0 !important;
                padding: 0 !important;
                cursor: pointer !important;
                accent-color: #0F172A !important;
                flex-shrink: 0 !important;
                display: block !important;
                opacity: 1 !important;
                visibility: visible !important;
                position: relative !important;
                border: 2px solid #CBD5E1 !important;
                border-radius: 4px !important;
                background: white !important;
            }

            #chat-widget-wrapper .chat-consent-checkbox-input:checked {
                background: #0F172A !important;
                border-color: #0F172A !important;
            }

            #chat-widget-wrapper .chat-consent-checkbox-label {
                font-size: 13px !important;
                line-height: 1.6 !important;
                color: #475569 !important;
                cursor: pointer !important;
                user-select: none !important;
                display: block !important;
                flex: 1 !important;
            }

            #chat-widget-wrapper .consent-accept-button {
                width: 100%;
                padding: 14px;
                background: #0F172A;
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                font-family: inherit;
            }

            #chat-widget-wrapper .consent-accept-button:disabled {
                opacity: 0.4;
                cursor: not-allowed;
            }

            #chat-widget-wrapper .consent-accept-button:not(:disabled):hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(15, 23, 42, 0.16);
            }

            #chat-widget-wrapper .consent-accept-button:not(:disabled):active {
                transform: translateY(0);
            }

            /* Chat Header */
            #chat-widget-wrapper .chat-header {
                background: white;
                color: #0F172A;
                padding: 16px 20px;
                display: flex;
                align-items: center;
                gap: 12px;
                border-bottom: 1px solid #F1F5F9;
                flex-shrink: 0;
            }

            #chat-widget-wrapper .chat-header-close {
                display: none;
                width: 32px;
                height: 32px;
                border-radius: 8px;
                background: transparent;
                border: none;
                cursor: pointer;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                flex-shrink: 0;
                margin-left: auto;
            }

            #chat-widget-wrapper .chat-header-close:hover {
                background: #F1F5F9;
            }

            #chat-widget-wrapper .chat-header-close svg {
                width: 20px;
                height: 20px;
                stroke: #64748B;
                stroke-width: 2;
            }

            #chat-widget-wrapper .chat-header-avatar {
                width: 40px;
                height: 40px;
                border-radius: 10px;
                background: #0F172A;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            #chat-widget-wrapper .chat-header-avatar svg {
                width: 20px;
                height: 20px;
                stroke: white;
                fill: none;
                stroke-width: 2;
            }

            #chat-widget-wrapper .chat-header-info {
                flex: 1;
                min-width: 0;
            }

            #chat-widget-wrapper .chat-header-info h3 {
                font-size: 15px;
                font-weight: 600;
                margin-bottom: 2px;
                color: #0F172A;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            #chat-widget-wrapper .chat-header-info p {
                font-size: 13px;
                color: #64748B;
            }

            #chat-widget-wrapper .chat-header-status {
                display: flex;
                align-items: center;
                gap: 6px;
            }

            #chat-widget-wrapper .status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #10B981;
                flex-shrink: 0;
            }

            /* Chat Content Wrapper */
            #chat-widget-wrapper .chat-content-wrapper {
                display: none;
                flex-direction: column;
                height: 100%;
            }

            #chat-widget-wrapper .chat-content-wrapper.active {
                display: flex;
            }

            /* Chat Messages */
            #chat-widget-wrapper .chat-messages {
                flex: 1;
                overflow-y: auto;
                overflow-x: hidden;
                padding: 20px;
                background: #FAFAFA;
                display: flex;
                flex-direction: column;
                gap: 16px;
                -webkit-overflow-scrolling: touch;
            }

            #chat-widget-wrapper .chat-messages::-webkit-scrollbar {
                width: 6px;
            }

            #chat-widget-wrapper .chat-messages::-webkit-scrollbar-track {
                background: transparent;
            }

            #chat-widget-wrapper .chat-messages::-webkit-scrollbar-thumb {
                background: #CBD5E1;
                border-radius: 3px;
            }

            #chat-widget-wrapper .chat-messages::-webkit-scrollbar-thumb:hover {
                background: #94A3B8;
            }

            #chat-widget-wrapper .message {
                display: flex;
                gap: 10px;
                animation: messageAppear 0.3s ease;
                align-items: flex-start;
                max-width: 100%;
            }

            @keyframes messageAppear {
                from {
                    opacity: 0;
                    transform: translateY(8px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            #chat-widget-wrapper .message.user {
                flex-direction: row-reverse;
            }

            #chat-widget-wrapper .message-avatar {
                width: 32px;
                height: 32px;
                border-radius: 8px;
                background: #F1F5F9;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            #chat-widget-wrapper .message-avatar svg {
                width: 16px;
                height: 16px;
                stroke: #64748B;
                fill: none;
                stroke-width: 2;
            }

            #chat-widget-wrapper .message.user .message-avatar {
                background: #0F172A;
            }

            #chat-widget-wrapper .message.user .message-avatar svg {
                stroke: white;
            }

            #chat-widget-wrapper .message-content {
                display: flex;
                flex-direction: column;
                gap: 4px;
                max-width: calc(100% - 42px);
                min-width: 0;
            }

            #chat-widget-wrapper .message-bubble {
                padding: 12px 16px;
                border-radius: 12px;
                background: white;
                border: 1px solid #E2E8F0;
                word-wrap: break-word;
                overflow-wrap: break-word;
                word-break: break-word;
            }

            #chat-widget-wrapper .message.user .message-bubble {
                background: #0F172A;
                color: white;
                border: none;
            }

            #chat-widget-wrapper .message-text {
                font-size: 14px;
                line-height: 1.5;
                white-space: pre-wrap;
                word-wrap: break-word;
                overflow-wrap: break-word;
                word-break: break-word;
                color: #1E293B;
            }

            #chat-widget-wrapper .message.user .message-text {
                color: white;
            }

            #chat-widget-wrapper .message-time {
                font-size: 11px;
                color: #94A3B8;
                padding: 0 4px;
            }

            #chat-widget-wrapper .message.user .message-time {
                text-align: right;
            }

            /* Typing Indicator */
            #chat-widget-wrapper .typing-indicator {
                display: none;
                align-items: center;
                gap: 6px;
                padding: 12px 16px;
                background: white;
                border: 1px solid #E2E8F0;
                border-radius: 12px;
                width: fit-content;
            }

            #chat-widget-wrapper .typing-indicator.active {
                display: flex;
            }

            #chat-widget-wrapper .typing-dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: #CBD5E1;
                animation: typingAnimation 1.4s infinite;
            }

            #chat-widget-wrapper .typing-dot:nth-child(2) {
                animation-delay: 0.2s;
            }

            #chat-widget-wrapper .typing-dot:nth-child(3) {
                animation-delay: 0.4s;
            }

            @keyframes typingAnimation {
                0%, 60%, 100% {
                    transform: translateY(0);
                    opacity: 0.4;
                }
                30% {
                    transform: translateY(-6px);
                    opacity: 1;
                }
            }

            /* Chat Input */
            #chat-widget-wrapper .chat-input {
                padding: 16px 20px;
                background: white;
                border-top: 1px solid #F1F5F9;
                display: flex;
                gap: 12px;
                align-items: flex-end;
                flex-shrink: 0;
                position: relative;
                z-index: 10;
            }

            #chat-widget-wrapper .chat-input-field {
                flex: 1;
                padding: 12px 16px;
                border: 1px solid #E2E8F0;
                border-radius: 10px;
                font-size: 14px;
                outline: none;
                transition: all 0.2s;
                font-family: inherit;
                color: #1E293B;
                background: #FAFAFA;
                resize: none;
                min-height: 44px;
                max-height: 120px;
                line-height: 1.5;
            }

            #chat-widget-wrapper .chat-input-field:focus {
                border-color: #0F172A;
                background: white;
            }

            #chat-widget-wrapper .chat-input-field::placeholder {
                color: #94A3B8;
            }

            #chat-widget-wrapper .chat-send-button {
                width: 44px;
                height: 44px;
                border-radius: 10px;
                background: #0F172A;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                flex-shrink: 0;
                touch-action: manipulation;
            }

            #chat-widget-wrapper .chat-send-button:hover:not(:disabled) {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(15, 23, 42, 0.16);
            }

            #chat-widget-wrapper .chat-send-button:active:not(:disabled) {
                transform: translateY(0);
            }

            #chat-widget-wrapper .chat-send-button:disabled {
                opacity: 0.4;
                cursor: not-allowed;
            }

            #chat-widget-wrapper .chat-send-button svg {
                width: 18px;
                height: 18px;
                stroke: white;
                fill: none;
                stroke-width: 2;
            }

            /* Mobile Responsive - Tablets */
            @media (max-width: 768px) {
                #chat-widget-wrapper .chat-container {
                    width: 380px;
                    height: 550px;
                }

                #chat-widget-wrapper .chat-messages {
                    padding: 16px;
                    gap: 14px;
                }

                #chat-widget-wrapper .message-content {
                    max-width: calc(100% - 38px);
                }
            }

            /* Mobile Responsive - Small Tablets & Large Phones */
            @media (max-width: 640px) {
                #chat-widget-wrapper .chat-button {
                    bottom: 16px !important;
                    right: 16px !important;
                    width: 52px;
                    height: 52px;
                }

                #chat-widget-wrapper .chat-container {
                    width: calc(100vw - 32px);
                    height: calc(100vh - 100px);
                    right: 16px !important;
                    bottom: 80px !important;
                    border-radius: 12px;
                }

                #chat-widget-wrapper .chat-header {
                    padding: 14px 16px;
                }

                #chat-widget-wrapper .chat-messages {
                    padding: 16px;
                }

                #chat-widget-wrapper .chat-input {
                    padding: 14px 16px;
                    gap: 10px;
                }

                #chat-widget-wrapper .message-content {
                    max-width: calc(100% - 40px);
                }

                #chat-widget-wrapper .consent-header,
                #chat-widget-wrapper .consent-content,
                #chat-widget-wrapper .consent-footer {
                    padding: 16px;
                }
            }

            /* Mobile Responsive - Phones */
            @media (max-width: 480px) {
                #chat-widget-wrapper .chat-button {
                    width: 50px;
                    height: 50px;
                    bottom: 12px !important;
                    right: 12px !important;
                }

                #chat-widget-wrapper .chat-button svg {
                    width: 22px;
                    height: 22px;
                }

                #chat-widget-wrapper .chat-container {
                    width: 100vw !important;
                    max-width: 100vw !important;
                    height: 100vh !important;
                    height: 100dvh !important;
                    max-height: none !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    top: 0 !important;
                    left: 0 !important;
                    border-radius: 0 !important;
                    position: fixed !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    box-shadow: none !important;
                }

                /* Keyboard open state - adjust to viewport */
                #chat-widget-wrapper .chat-container.keyboard-open {
                    height: 100vh !important;
                    max-height: 100vh !important;
                    bottom: 0 !important;
                    top: auto !important;
                }

                #chat-widget-wrapper .chat-header {
                    padding: 16px 16px;
                    border-bottom: 1px solid #E2E8F0;
                    width: 100%;
                }

                /* Show close button on mobile */
                #chat-widget-wrapper .chat-header-close {
                    display: flex;
                }

                #chat-widget-wrapper .chat-header-avatar {
                    width: 40px;
                    height: 40px;
                }

                #chat-widget-wrapper .chat-header-info h3 {
                    font-size: 16px;
                }

                #chat-widget-wrapper .chat-header-info p {
                    font-size: 13px;
                }

                #chat-widget-wrapper .chat-messages {
                    padding: 16px;
                    gap: 16px;
                    width: 100%;
                }

                #chat-widget-wrapper .message-avatar {
                    width: 32px;
                    height: 32px;
                }

                #chat-widget-wrapper .message-avatar svg {
                    width: 16px;
                    height: 16px;
                }

                #chat-widget-wrapper .message-content {
                    max-width: calc(100% - 42px);
                }

                #chat-widget-wrapper .message-bubble {
                    padding: 12px 16px;
                    border-radius: 12px;
                }

                #chat-widget-wrapper .message-text {
                    font-size: 15px;
                    line-height: 1.5;
                }

                #chat-widget-wrapper .message-time {
                    font-size: 11px;
                }

                #chat-widget-wrapper .chat-input {
                    padding: 16px;
                    gap: 12px;
                    border-top: 1px solid #E2E8F0;
                    background: white;
                    width: 100%;
                }

                #chat-widget-wrapper .chat-input-field {
                    padding: 12px 16px;
                    font-size: 16px;
                    border-radius: 12px;
                    min-height: 48px;
                }

                #chat-widget-wrapper .chat-send-button {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                }

                #chat-widget-wrapper .chat-send-button svg {
                    width: 20px;
                    height: 20px;
                }

                #chat-widget-wrapper .consent-header h3 {
                    font-size: 17px;
                }

                #chat-widget-wrapper .consent-text {
                    font-size: 14px;
                    padding: 16px;
                }
            }

            /* Landscape Mobile */
            @media (max-height: 500px) and (orientation: landscape) and (max-width: 768px) {
                #chat-widget-wrapper .chat-container {
                    height: 100vh !important;
                }

                #chat-widget-wrapper .chat-header {
                    padding: 12px 16px;
                }

                #chat-widget-wrapper .chat-messages {
                    padding: 12px 16px;
                }

                #chat-widget-wrapper .chat-input {
                    padding: 12px 16px;
                }

                #chat-widget-wrapper .message-bubble {
                    padding: 10px 14px;
                }

                #chat-widget-wrapper .consent-header,
                #chat-widget-wrapper .consent-content,
                #chat-widget-wrapper .consent-footer {
                    padding: 12px 16px;
                }
            }

            /* Prevent zoom on iOS input focus */
            @supports (-webkit-touch-callout: none) {
                #chat-widget-wrapper .chat-input-field {
                    font-size: 16px;
                }

                /* Fix iOS keyboard scroll issues - use visual viewport */
                @media (max-width: 480px) {
                    #chat-widget-wrapper .chat-container {
                        height: 100vh !important;
                        height: -webkit-fill-available !important;
                    }

                    /* Ensure input stays above keyboard */
                    #chat-widget-wrapper .chat-input {
                        position: sticky;
                        bottom: 0;
                        background: white;
                        z-index: 100;
                    }
                }
            }

            /* Safe area for notched phones */
            @supports (padding: max(0px)) {
                @media (max-width: 480px) {
                    #chat-widget-wrapper .chat-header,
                    #chat-widget-wrapper .consent-header {
                        padding-top: max(env(safe-area-inset-top), 16px);
                    }

                    #chat-widget-wrapper .chat-input,
                    #chat-widget-wrapper .consent-footer {
                        padding-bottom: max(env(safe-area-inset-bottom), 16px);
                    }
                }
            }
        </style>

        <!-- Chat Button -->
        <button class="chat-button" id="chatButton" aria-label="Open chat">
            <svg class="icon-chat" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <svg class="icon-close" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>

        <!-- Chat Container -->
        <div class="chat-container" id="chatContainer">
            <!-- Consent Screen -->
            <div class="consent-screen" id="consentScreen">
                <div class="consent-header">
                    <h3>Datenschutz & Einwilligung</h3>
                    <p>Bitte lesen Sie die folgende Datenschutzerklärung, bevor Sie fortfahren.</p>
                </div>

                <div class="consent-content">
                    <div class="consent-text">
                        Ich habe die <a href="https://www.pixformance.com/datenschutz/" target="_blank" rel="noopener noreferrer" class="consent-link">Datenschutzerklärung</a> gelesen und willige ein, dass die Pixformance Sports GmbH mir ein Testangebot unterbreiten und mich per E-Mail oder Telefon zu Produkten und allgemeinen Unternehmens-Infos kontaktieren darf. Die Einwilligung kann jederzeit widerrufen werden.
                    </div>
                </div>

                <div class="consent-footer">
                    <div class="chat-consent-checkbox-wrapper">
                        <input type="checkbox" id="consentCheckbox" class="chat-consent-checkbox-input">
                        <label for="consentCheckbox" class="chat-consent-checkbox-label">
                            Ich stimme den oben genannten Bedingungen zu und möchte den Chat nutzen.
                        </label>
                    </div>
                    <button class="consent-accept-button" id="consentAcceptButton" disabled>
                        Akzeptieren & Chat starten
                    </button>
                </div>
            </div>

            <!-- Chat Content (Hidden initially) -->
            <div class="chat-content-wrapper" id="chatContentWrapper">
                <!-- Header -->
                <div class="chat-header">
                    <div class="chat-header-avatar">
                        <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </div>
                    <div class="chat-header-info">
                        <h3>Virtual Assistant</h3>
                        <div class="chat-header-status">
                            <span class="status-dot"></span>
                            <p>Online</p>
                        </div>
                    </div>
                    <button class="chat-header-close" id="chatHeaderClose" aria-label="Close chat">
                        <svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <!-- Messages -->
                <div class="chat-messages" id="chatMessages">
                    <div class="message bot">
                        <div class="message-avatar">
                            <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                        </div>
                        <div class="message-content">
                            <div class="message-bubble">
                                <div class="message-text">Hello! How can I help you today?</div>
                            </div>
                            <div class="message-time" id="initialTime"></div>
                        </div>
                    </div>
                </div>

                <!-- Input -->
                <div class="chat-input">
                    <textarea
                        class="chat-input-field"
                        id="chatInputField"
                        placeholder="Type your message..."
                        autocomplete="off"
                        rows="1"
                    ></textarea>
                    <button class="chat-send-button" id="chatSendButton" aria-label="Send message">
                        <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <script>
        // ============================================
        // SELF-EXTRACTION: Move widget to body
        // ============================================
        (function() {
            const wrapper = document.getElementById('chat-widget-wrapper');
            if (wrapper && wrapper.parentElement !== document.body) {
                console.log('🔄 Moving widget to body...');
                document.body.appendChild(wrapper);
                console.log('✅ Widget moved to body successfully');
            }
        })();

        // ============================================
        // CONFIGURATION - CHANGE HERE
        // ============================================
        const CONFIG = {
            n8nWebhookUrl: 'https://webhook.agenciacomo.com.br/webhook/chat', // CHANGE TO YOUR N8N URL
            sessionId: generateSessionId(),
            botName: 'Virtual Assistant',
            welcomeMessage: 'Hello! How can I help you today?',

            // Delay between messages (in milliseconds)
            messageDelay: 1500,  // 1.5 seconds (adjust as preferred)

            // Simulated typing speed
            typingSpeed: 'medium'  // 'fast' = 800ms, 'medium' = 1500ms, 'slow' = 2500ms
        };

        // ============================================
        // DOM ELEMENTS
        // ============================================
        const chatButton = document.getElementById('chatButton');
        const chatContainer = document.getElementById('chatContainer');
        const chatMessages = document.getElementById('chatMessages');
        const chatInputField = document.getElementById('chatInputField');
        const chatSendButton = document.getElementById('chatSendButton');
        const chatHeaderClose = document.getElementById('chatHeaderClose');
        const consentScreen = document.getElementById('consentScreen');
        const consentCheckbox = document.getElementById('consentCheckbox');
        const consentAcceptButton = document.getElementById('consentAcceptButton');
        const chatContentWrapper = document.getElementById('chatContentWrapper');

        let messageCount = 0;
        let consentGiven = false;

        // ============================================
        // CONSENT HANDLING
        // ============================================

        // Check if consent was previously given (using localStorage)
        function checkPreviousConsent() {
            const previousConsent = localStorage.getItem('chatConsentGiven');
            if (previousConsent === 'true') {
                consentGiven = true;
                showChatContent();
            }
        }

        // Enable/disable accept button based on checkbox
        consentCheckbox.addEventListener('change', () => {
            consentAcceptButton.disabled = !consentCheckbox.checked;
        });

        // Handle consent acceptance
        consentAcceptButton.addEventListener('click', () => {
            if (consentCheckbox.checked) {
                consentGiven = true;
                localStorage.setItem('chatConsentGiven', 'true');

                console.log('✅ Consent accepted');

                // Send consent confirmation to n8n
                sendConsentToN8N();

                showChatContent();
            }
        });

        function showChatContent() {
            consentScreen.classList.add('hidden');
            chatContentWrapper.classList.add('active');

            setTimeout(() => {
                chatInputField.focus();
                scrollToBottom();
            }, 100);
        }

        async function sendConsentToN8N() {
            try {
                await fetch(CONFIG.n8nWebhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        eventType: 'consent_accepted',
                        sessionId: CONFIG.sessionId,
                        timestamp: new Date().toISOString(),
                        consentText: 'Datenschutzerklärung accepted',
                        metadata: {
                            url: window.location.href,
                            userAgent: navigator.userAgent
                        }
                    })
                });
                console.log('📤 Consent sent to n8n');
            } catch (error) {
                console.error('❌ Error sending consent:', error);
            }
        }

        // ============================================
        // AUTO-RESIZE TEXTAREA
        // ============================================
        function autoResizeTextarea() {
            chatInputField.style.height = 'auto';
            const newHeight = Math.min(chatInputField.scrollHeight, 120);
            chatInputField.style.height = newHeight + 'px';
        }

        chatInputField.addEventListener('input', autoResizeTextarea);

        // ============================================
        // MOBILE KEYBOARD HANDLING
        // ============================================
        let originalViewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        let keyboardHeight = 0;

        function handleKeyboardVisibility() {
            if (window.innerWidth > 480) return; // Only on mobile

            const currentHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
            keyboardHeight = originalViewportHeight - currentHeight;

            // Keyboard is open if viewport shrunk by more than 150px
            if (keyboardHeight > 150) {
                chatContainer.classList.add('keyboard-open');
                chatContainer.style.height = currentHeight + 'px';

                console.log('⌨️ Keyboard opened:', keyboardHeight + 'px');

                // Scroll messages to bottom and ensure input is visible
                setTimeout(() => {
                    scrollToBottom();

                    // Extra push to ensure input is fully visible
                    if (chatInputField) {
                        chatInputField.scrollIntoView({
                            behavior: 'smooth',
                            block: 'end',
                            inline: 'nearest'
                        });
                    }
                }, 150);
            } else {
                chatContainer.classList.remove('keyboard-open');
                chatContainer.style.height = '';
                console.log('⌨️ Keyboard closed');
            }
        }

        // Listen for viewport changes (keyboard open/close)
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleKeyboardVisibility);
            window.visualViewport.addEventListener('scroll', handleKeyboardVisibility);
        }

        // Fallback for older browsers
        let resizeTimeout;
        window.addEventListener('resize', () => {
            if (!window.visualViewport && window.innerWidth <= 480) {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(handleKeyboardVisibility, 100);
            }
        });

        // Handle focus events
        chatInputField.addEventListener('focus', () => {
            console.log('🎯 Input focused');

            // Update viewport reference
            if (!chatContainer.classList.contains('keyboard-open')) {
                originalViewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
            }

            setTimeout(handleKeyboardVisibility, 300);

            // Extra scroll to ensure visibility
            if (window.innerWidth <= 480) {
                setTimeout(() => {
                    scrollToBottom();
                    chatInputField.scrollIntoView({
                        behavior: 'smooth',
                        block: 'end'
                    });
                }, 500);
            }
        });

        chatInputField.addEventListener('blur', () => {
            console.log('🎯 Input blurred');
            setTimeout(handleKeyboardVisibility, 300);
        });

        // ============================================
        // HELPER FUNCTIONS
        // ============================================
        function generateSessionId() {
            return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }

        function getCurrentTime() {
            const now = new Date();
            return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }

        function scrollToBottom() {
            requestAnimationFrame(() => {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            });
        }

        // ============================================
        // MESSAGE RENDERING
        // ============================================
        function addMessage(text, isUser = false) {
            messageCount++;
            console.log(`💬 Adding message #${messageCount}:`, {
                type: isUser ? 'user' : 'bot',
                text: text.substring(0, 50) + '...',
                totalMessages: chatMessages.children.length
            });

            hideTypingIndicator();

            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;
            messageDiv.setAttribute('data-message-id', messageCount);

            const time = getCurrentTime();
            const formattedText = formatMessage(text);

            const iconSvg = `
                <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                    ${isUser
                        ? '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>'
                        : '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>'
                    }
                </svg>
            `;

            messageDiv.innerHTML = `
                <div class="message-avatar">${iconSvg}</div>
                <div class="message-content">
                    <div class="message-bubble">
                        <div class="message-text">${formattedText}</div>
                    </div>
                    <div class="message-time">${time}</div>
                </div>
            `;

            chatMessages.appendChild(messageDiv);

            setTimeout(() => {
                scrollToBottom();
            }, 100);
        }

        function formatMessage(text) {
            let formatted = escapeHtml(text);
            formatted = formatted.replace(/\n/g, '<br>');
            formatted = formatted.replace(/•/g, '<br>•');
            return formatted;
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function showTypingIndicator() {
            const typingDiv = document.createElement('div');
            typingDiv.className = 'message bot';
            typingDiv.id = 'typingIndicator';

            const iconSvg = `
                <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
            `;

            typingDiv.innerHTML = `
                <div class="message-avatar">${iconSvg}</div>
                <div class="message-content">
                    <div class="typing-indicator active">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                </div>
            `;

            chatMessages.appendChild(typingDiv);
            scrollToBottom();
        }

        function hideTypingIndicator() {
            const typingIndicator = document.getElementById('typingIndicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }
        }

        // ============================================
        // N8N COMMUNICATION
        // ============================================
        async function sendMessageToN8N(message) {
            console.log('📤 Sending message:', message);

            try {
                const response = await fetch(CONFIG.n8nWebhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: message,
                        sessionId: CONFIG.sessionId,
                        timestamp: new Date().toISOString(),
                        userAgent: navigator.userAgent,
                        consentGiven: consentGiven,
                        metadata: {
                            url: window.location.href,
                            referrer: document.referrer,
                            screenSize: {
                                width: window.innerWidth,
                                height: window.innerHeight
                            }
                        }
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('📥 Response received:', data);

                return data;
            } catch (error) {
                console.error('❌ Error communicating with n8n:', error);
                throw error;
            }
        }

        // ============================================
        // EVENT HANDLERS
        // ============================================
        async function handleSendMessage() {
            const message = chatInputField.value.trim();

            if (!message) return;

            chatInputField.value = '';
            chatInputField.style.height = 'auto';
            chatSendButton.disabled = true;

            // Blur input on mobile to close keyboard after sending
            if (window.innerWidth <= 480) {
                chatInputField.blur();
            }

            addMessage(message, true);
            showTypingIndicator();

            try {
                const data = await sendMessageToN8N(message);
                hideTypingIndicator();

                let messagesToDisplay = [];

                if (data.messages && Array.isArray(data.messages)) {
                    messagesToDisplay = data.messages;
                } else if (data.messages && typeof data.messages === 'string') {
                    try {
                        const parsed = JSON.parse(data.messages);
                        messagesToDisplay = Array.isArray(parsed) ? parsed : [data.messages];
                    } catch {
                        messagesToDisplay = [data.messages];
                    }
                } else if (data.response) {
                    messagesToDisplay = [data.response];
                } else if (data.message) {
                    messagesToDisplay = [data.message];
                } else {
                    messagesToDisplay = ['Sorry, I didn\'t receive a valid response.'];
                }

                messagesToDisplay = messagesToDisplay.filter(msg => msg && msg.trim());

                if (messagesToDisplay.length > 0) {
                    await displayMessagesSequentially(messagesToDisplay);
                } else {
                    addMessage('Sorry, I didn\'t receive a valid response.', false);
                }
            } catch (error) {
                console.error('❌ Error sending message:', error);
                hideTypingIndicator();
                addMessage('Sorry, an error occurred. Please try again.', false);
            } finally {
                chatSendButton.disabled = false;
                chatInputField.focus();
            }
        }

        // ============================================
        // SEQUENTIAL MESSAGE DISPLAY
        // ============================================
        async function displayMessagesSequentially(messages) {
            const delays = {
                'fast': 800,
                'medium': 1500,
                'slow': 2500
            };
            const delayMs = delays[CONFIG.typingSpeed] || CONFIG.messageDelay;

            for (let i = 0; i < messages.length; i++) {
                const message = messages[i];

                if (i > 0) {
                    showTypingIndicator();
                    await sleep(delayMs);
                }

                hideTypingIndicator();
                addMessage(message, false);
            }
        }

        function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        // ============================================
        // EVENT LISTENERS
        // ============================================
        function closeChat() {
            chatButton.classList.remove('active');
            chatContainer.classList.remove('active');

            // Unlock body scroll when chat closes
            if (window.innerWidth <= 480) {
                document.body.style.overflow = '';
                document.documentElement.style.overflow = '';
                document.body.style.position = '';
                document.body.style.width = '';
                document.body.style.top = '';
            }

            // Reset container height
            chatContainer.style.height = '';
            chatContainer.classList.remove('keyboard-open');
        }

        chatButton.addEventListener('click', () => {
            chatButton.classList.toggle('active');
            chatContainer.classList.toggle('active');

            if (chatContainer.classList.contains('active')) {
                // Update viewport height reference when opening (before keyboard)
                if (window.visualViewport) {
                    originalViewportHeight = window.visualViewport.height;
                } else {
                    originalViewportHeight = window.innerHeight;
                }

                console.log('📱 Chat opened. Viewport height:', originalViewportHeight + 'px');

                // Lock body scroll on mobile when chat is open
                if (window.innerWidth <= 480) {
                    document.body.style.overflow = 'hidden';
                    document.documentElement.style.overflow = 'hidden';
                    document.body.style.position = 'fixed';
                    document.body.style.width = '100%';
                    document.body.style.top = '0';
                }

                // Focus on appropriate element based on consent status
                if (!consentGiven) {
                    setTimeout(() => {
                        consentCheckbox.focus();
                    }, 100);
                } else {
                    setTimeout(() => {
                        chatInputField.focus();
                        scrollToBottom();
                    }, 100);
                }
            } else {
                // Unlock body scroll when chat closes
                if (window.innerWidth <= 480) {
                    document.body.style.overflow = '';
                    document.documentElement.style.overflow = '';
                    document.body.style.position = '';
                    document.body.style.width = '';
                    document.body.style.top = '';
                }
            }
        });

        // Close button in header (mobile)
        chatHeaderClose.addEventListener('click', closeChat);

        chatSendButton.addEventListener('click', handleSendMessage);

        chatInputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });

        chatContainer.addEventListener('touchmove', (e) => {
            e.stopPropagation();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && chatContainer.classList.contains('active')) {
                closeChat();
            }
        });

        // ============================================
        // INITIALIZATION
        // ============================================
        document.getElementById('initialTime').textContent = getCurrentTime();

        // Check if user previously gave consent
        checkPreviousConsent();

        console.log('✅ Chat Widget initialized');
        console.log('📍 Session ID:', CONFIG.sessionId);
        console.log('📱 Screen size:', window.innerWidth + 'x' + window.innerHeight);
        console.log('✅ Consent status:', consentGiven ? 'Previously accepted' : 'Pending');
    </script>

</body>
</html>
