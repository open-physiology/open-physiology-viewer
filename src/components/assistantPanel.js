import {NgModule, Component, ChangeDetectionStrategy, Input, ViewChild, ElementRef} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {MatListModule} from '@angular/material/list';
import graphSchema from '../model/graphScheme.json';
import { sendOpenAIChat } from '../api/openai';
import { sendAnthropicChat } from '../api/anthropic';

/**
 * AssistantPanel provides a simple panel to compose requests to an AI coding assistant
 * and view the history of requests and answers.
 */
@Component({
    selector: 'assistant-panel',
    changeDetection: ChangeDetectionStrategy.Default,
    template: `
        <section id="assistant-panel" class="w3-white">
            <header class="assistant-header" title="AI Assistant">
                <i class="fa fa-robot assistant-icon" aria-hidden="true"></i>
                <span class="assistant-title">AI Assistant</span>
            </header>
            <!-- Top: Conversation (fills remaining space) -->
            <section class="top-pane">
                <fieldset class="w3-card w3-round w3-margin-small fill">
                    <legend>Conversation</legend>
                    <div class="conv-controls"><button class="w3-button w3-tiny w3-light-grey" (click)="scrollConversationTop()" title="Scroll to top"><i class="fa fa-arrow-up"></i></button><button class="w3-button w3-tiny w3-light-grey" (click)="scrollConversationBottom()" title="Scroll to bottom"><i class="fa fa-arrow-down"></i></button></div>
                                        <mat-nav-list #convList class="conversation" (wheel)="$event.stopPropagation()">
                        <ng-container *ngIf="messages.length; else empty">
                            <mat-list-item *ngFor="let m of messages; let i = index">
                                <div class="message" [ngClass]="m.role">
                                    <div class="meta">
                                        <i class="fa" [ngClass]="m.role === 'user' ? 'fa-user' : 'fa-robot'"></i>
                                        <span class="role">{{ m.role === 'user' ? 'You' : 'Assistant' }}</span>
                                        <span class="time">{{ m.time | date:'short' }}</span>
                                    </div>
                                    <div class="content">{{ m.content }}</div>
                                </div>
                            </mat-list-item>
                        </ng-container>
                        <ng-template #empty>
                            <div class="w3-padding-small w3-text-grey">No messages yet. Compose a request below and click Send.</div>
                        </ng-template>
                    </mat-nav-list>
                </fieldset>
            </section>

            <!-- Horizontal resizer between conversation and request editor -->
            <div class="v-resizer" title="Drag to resize" (mousedown)="startVResize($event)"></div>

            <!-- Bottom: Request editor (resizable vertically) -->
            <section class="bottom-pane" [style.height.px]="editorHeight">
                <fieldset class="w3-card w3-round w3-margin-small fill">
                    <legend>Compose request</legend>
                    <div class="editor-wrap">
                        <textarea class="w3-input request-editor"
                                  [(ngModel)]="draft"
                                  placeholder="Describe your coding question or request here..."></textarea>
                        <div class="w3-margin-top w3-right toolbar" style="display:flex; gap:8px; align-items:center; flex-wrap: wrap; justify-content: flex-end;">
                            <label class="w3-small" title="Choose preferred assistant">
                                Assistant:
                                <select class="w3-select w3-border w3-small" [(ngModel)]="provider" style="width:auto; display:inline-block;">
                                    <option value="ChatGPT">ChatGPT</option>
                                    <option value="Claude">Claude</option>
                                </select>
                            </label>
                            <label class="w3-small" title="Include current JSON model in the context">
                                <input type="checkbox" [(ngModel)]="includeModel" [ngModelOptions]="{standalone: true}" checked>
                                Include model
                            </label>
                            <label class="w3-small" title="Include JSON schema in the context">
                                <input type="checkbox" [(ngModel)]="includeSchema" [ngModelOptions]="{standalone: true}" checked>
                                Include schema
                            </label>
                            <button class="w3-button w3-blue w3-small" (click)="send()" [disabled]="!canSend()">
                                <i class="fa fa-paper-plane" [ngClass]="{'fa-spin': isSending}"></i> {{ isSending ? 'Sending...' : 'Send' }}
                            </button>
                            <button class="w3-button w3-light-grey w3-small" (click)="clearDraft()" [disabled]="!draft || isSending">
                                <i class="fa fa-eraser"></i> Clear
                            </button>
                        </div>
                    </div>
                </fieldset>
            </section>
        </section>
    `,
    styles: [`
        #assistant-panel {
            height: 100%;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        /* Header styled similarly to Material tab labels */
        .assistant-header {
            display: flex;
            align-items: center;
            gap: 8px;
            height: 48px; /* similar to mat-tab header height */
            padding: 0 16px;
            border-bottom: 1px solid #e0e0e0;
            background: #fafafa;
            font-weight: 500;
            color: rgba(0,0,0,0.87);
            letter-spacing: .01071em;
        }
        .assistant-icon {
            font-size: 16px;
            color: #616161;
        }
        .assistant-title {
            font-size: 14px;
            white-space: nowrap;
        }
        fieldset { border: 1px solid grey; margin: 4px; position: relative; }
        legend { padding: 0.2em 0.5em; border: 1px solid grey; color: grey; font-size: 90%; }
        .fill { height: 100%; display: flex; flex-direction: column; }

        .top-pane { flex: 1 1 auto; min-height: 80px; }
        .bottom-pane { flex: 0 0 auto; min-height: 60px; overflow: hidden; }

        .editor-wrap { display: flex; flex-direction: column; height: 100%; }
        .request-editor { width: 100%; flex: 1 1 auto; min-height: 60px; resize: none; }
        .toolbar { flex: 0 0 auto; }

        .v-resizer {
            flex: 0 0 6px;
            cursor: row-resize;
            background: #f1f1f1;
            border-top: 1px solid #e0e0e0;
            border-bottom: 1px solid #e0e0e0;
        }
        .v-resizer:hover { background: #e7e7e7; }

        .conversation { height: 100%; overflow-y: auto; }
        .conversation .content { font-size: 12px; line-height: 1.35; }
        .message { width: 100%; }
        .message .meta { font-size: 12px; color: #666; margin-bottom: 4px; display: flex; gap: 6px; align-items: center; }
        .message.user .content { white-space: pre-wrap; background: #eef6ff; border-left: 3px solid #7ab3ff; padding: 6px; border-radius: 3px; }
        .message.assistant .content { white-space: pre-wrap; background: #f4f4f4; border-left: 3px solid #9e9e9e; padding: 6px; border-radius: 3px; }
        .conv-controls { position: absolute; top: 6px; right: 8px; display: flex; gap: 4px; z-index: 2; }
    `]
})
export class AssistantPanel {
    @Input() model;
    @ViewChild('convList') convList: ElementRef;

    draft = '';
    messages = [];

    // Provider and context options
    provider = 'ChatGPT'; // 'ChatGPT' or 'Claude'
    includeModel = true;
    includeSchema = true;
    isSending = false;

    // Vertical sizing state for the request editor
    editorHeight = 180; // px
    minEditorHeight = 80;
    maxEditorHeight = 420;
    _vResizing = false;
    _startY = 0;
    _startHeight = 0;

    canSend(){
        return !!(this.draft && this.draft.trim()) && !this.isSending;
    }

    clearDraft(){
        this.draft = '';
    }

    async send(){
        const content = (this.draft || '').trim();
        if (!content || this.isSending) { return; }
        const now = new Date();
        this.messages.push({ role: 'user', content, time: now });
        this._scrollToBottomSoon();
        this.isSending = true;

        try {
            const context = {};
            if (this.includeModel && this.model){ context.model = this.model; }
            if (this.includeSchema){ context.schema = graphSchema; }

            let replyText = '';
            if (this.provider === 'Claude'){
                replyText = await sendAnthropicChat({ prompt: content, context });
            } else {
                replyText = await sendOpenAIChat({ prompt: content, context });
            }

            this.messages.push({ role: 'assistant', content: replyText, time: new Date() });
            this._scrollToBottomSoon();
        } catch (err) {
            const msg = (err && err.message) ? err.message : String(err);
            this.messages.push({ role: 'assistant', content: `Error: ${msg}`, time: new Date() });
        } finally {
            this.isSending = false;
            this.draft = '';
        }
    }

    // Vertical resize handlers
    startVResize(event){
        this._vResizing = true;
        this._startY = event.clientY;
        this._startHeight = this.editorHeight;
        window.addEventListener('mousemove', this._onVMove);
        window.addEventListener('mouseup', this._onVUp);
    }

    _onVMove = (e) => {
        if (!this._vResizing) return;
        const deltaY = e.clientY - this._startY; // dragging UP should increase editor height
        const next = this._startHeight - deltaY;
        this.editorHeight = this._clamp(next, this.minEditorHeight, this.maxEditorHeight);
    };

    _onVUp = () => {
        if (!this._vResizing) return;
        this._vResizing = false;
        window.removeEventListener('mousemove', this._onVMove);
        window.removeEventListener('mouseup', this._onVUp);
    };

    // Conversation scroll helpers
    scrollConversationTop(){
        try {
            const el = this.convList && this.convList.nativeElement;
            if (el){ el.scrollTop = 0; }
        } catch(e) {}
    }
    scrollConversationBottom(){
        try {
            const el = this.convList && this.convList.nativeElement;
            if (el){ el.scrollTop = el.scrollHeight; }
        } catch(e) {}
    }
    _isNearBottom(){
        const el = this.convList && this.convList.nativeElement;
        if (!el) return false;
        const threshold = 60; // px
        return (el.scrollHeight - el.scrollTop - el.clientHeight) <= threshold;
    }
    _scrollToBottomSoon(){
        // Only auto-scroll if user is near the bottom already
        if (!this._isNearBottom()) return;
        setTimeout(() => this.scrollConversationBottom(), 0);
    }

    _clamp(val, min, max){
        return Math.max(min, Math.min(max, val));
    }

    ngOnDestroy(){
        window.removeEventListener('mousemove', this._onVMove);
        window.removeEventListener('mouseup', this._onVUp);
    }
}

@NgModule({
    imports: [CommonModule, FormsModule, MatListModule],
    declarations: [AssistantPanel],
    exports: [AssistantPanel]
})
export class AssistantPanelModule {}