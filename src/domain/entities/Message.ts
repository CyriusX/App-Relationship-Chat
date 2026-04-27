import { MessageId, MessageContent, MessageStatus, MessageType, ConversationId } from '../value-objects';

/**
 * Message Entity
 * Represents a single message within a conversation
 */
export class Message {
  private readonly _id: MessageId;
  private readonly _conversationId: ConversationId;
  private readonly _senderId: string;
  private _content: MessageContent;
  private _type: MessageType;
  private _status: MessageStatus;
  private readonly _createdAt: Date;
  private _editedAt: Date | null = null;
  private _deletedAt: Date | null = null;
  private _replyToId: MessageId | null = null;
  private _mediaUrl: string | null = null;

  private constructor(
    id: MessageId,
    conversationId: ConversationId,
    senderId: string,
    content: MessageContent,
    type: MessageType,
    status: MessageStatus,
    createdAt: Date,
    editedAt: Date | null = null,
    deletedAt: Date | null = null,
    replyToId: MessageId | null = null,
    mediaUrl: string | null = null
  ) {
    this._id = id;
    this._conversationId = conversationId;
    this._senderId = senderId;
    this._content = content;
    this._type = type;
    this._status = status;
    this._createdAt = createdAt;
    this._editedAt = editedAt;
    this._deletedAt = deletedAt;
    this._replyToId = replyToId;
    this._mediaUrl = mediaUrl;
  }

  /**
   * Factory method to create a new message
   */
  static create(
    conversationId: ConversationId,
    senderId: string,
    content: string,
    type: MessageType = MessageType.text()
  ): Message {
    const id = MessageId.generate();
    const messageContent = MessageContent.create(content);
    const status = MessageStatus.sent();
    const createdAt = new Date();

    return new Message(id, conversationId, senderId, messageContent, type, status, createdAt);
  }

  /**
   * Factory method to restore from persistence
   */
  static restore(
    id: string,
    conversationId: string,
    senderId: string,
    content: string,
    type: string,
    status: string,
    createdAt: Date,
    editedAt: Date | null = null,
    deletedAt: Date | null = null,
    replyToId: string | null = null,
    mediaUrl: string | null = null
  ): Message {
    return new Message(
      MessageId.create(id),
      ConversationId.create(conversationId),
      senderId,
      MessageContent.create(content),
      MessageType.fromString(type),
      MessageStatus.fromString(status),
      createdAt,
      editedAt,
      deletedAt,
      replyToId ? MessageId.create(replyToId) : null,
      mediaUrl
    );
  }

  // Getters
  get id(): MessageId {
    return this._id;
  }

  get conversationId(): ConversationId {
    return this._conversationId;
  }

  get senderId(): string {
    return this._senderId;
  }

  get content(): MessageContent {
    return this._content;
  }

  get type(): MessageType {
    return this._type;
  }

  get status(): MessageStatus {
    return this._status;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get editedAt(): Date | null {
    return this._editedAt;
  }

  get deletedAt(): Date | null {
    return this._deletedAt;
  }

  get replyToId(): MessageId | null {
    return this._replyToId;
  }

  get mediaUrl(): string | null {
    return this._mediaUrl;
  }

  get isEdited(): boolean {
    return this._editedAt !== null;
  }

  get isDeleted(): boolean {
    return this._deletedAt !== null;
  }

  // Domain behaviors

  /**
   * Edit message content
   */
  edit(newContent: string): void {
    if (this.isDeleted) {
      throw new Error('Cannot edit a deleted message');
    }

    this._content = MessageContent.create(newContent);
    this._editedAt = new Date();
  }

  /**
   * Soft delete message
   */
  delete(): void {
    if (this.isDeleted) {
      return; // Already deleted
    }

    this._deletedAt = new Date();
  }

  /**
   * Restore deleted message
   */
  restore(): void {
    this._deletedAt = null;
  }

  /**
   * Mark as delivered
   */
  markAsDelivered(): void {
    const newStatus = MessageStatus.delivered();
    if (this._status.canTransitionTo(newStatus)) {
      this._status = newStatus;
    }
  }

  /**
   * Mark as read
   */
  markAsRead(): void {
    const newStatus = MessageStatus.read();
    if (this._status.canTransitionTo(newStatus)) {
      this._status = newStatus;
    }
  }

  /**
   * Set reply reference
   */
  setReplyTo(messageId: MessageId): void {
    this._replyToId = messageId;
  }

  /**
   * Set media URL for media messages
   */
  setMediaUrl(url: string): void {
    if (!this._type.isMedia) {
      throw new Error('Cannot set media URL for non-media message');
    }
    this._mediaUrl = url;
  }

  // Equality
  equals(other: Message): boolean {
    return this._id.equals(other._id);
  }

  // Serialization
  toJSON(): {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    type: string;
    status: string;
    createdAt: Date;
    editedAt: Date | null;
    deletedAt: Date | null;
    replyToId: string | null;
    mediaUrl: string | null;
  } {
    return {
      id: this._id.value,
      conversationId: this._conversationId.value,
      senderId: this._senderId,
      content: this._content.value,
      type: this._type.value,
      status: this._status.value,
      createdAt: this._createdAt,
      editedAt: this._editedAt,
      deletedAt: this._deletedAt,
      replyToId: this._replyToId?.value ?? null,
      mediaUrl: this._mediaUrl,
    };
  }
}
