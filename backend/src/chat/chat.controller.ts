import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { CursorQueryDto } from './dto/cursor-query.dto';
import { SendTextMessageDto } from './dto/send-text-message.dto';
import { SendCustomOrderOfferDto } from './dto/send-custom-order-offer.dto';
import { StartConversationDto } from './dto/start-conversation.dto';
import type { AuthenticatedRequest } from '../common/interfaces/request.interface';

const ALLOWED_IMAGE_TYPES = /^image\/(jpeg|jpg|png|gif|webp)$/;

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('conversations')
  getConversations(
    @Request() req: AuthenticatedRequest,
    @Query() query: CursorQueryDto,
  ) {
    return this.chatService.listConversations(req.user.id, query);
  }

  @Get('conversations/:conversationId')
  getConversation(
    @Request() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
  ) {
    return this.chatService.getConversationSummaryForUser(
      conversationId,
      req.user.id,
    );
  }

  @Get('conversations/:conversationId/messages')
  getMessages(
    @Request() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Query() query: CursorQueryDto,
  ) {
    return this.chatService.getMessages(req.user.id, conversationId, query);
  }

  @Post('conversations')
  async startConversation(
    @Request() req: AuthenticatedRequest,
    @Body() dto: StartConversationDto,
  ) {
    const conversation = await this.chatService.startConversation(
      req.user.id,
      dto,
    );
    await this.chatGateway.emitConversationUpdated(conversation.id);
    return conversation;
  }

  @Post('conversations/:conversationId/messages/text')
  async sendTextMessage(
    @Request() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendTextMessageDto,
  ) {
    const message = await this.chatService.sendTextMessage(
      req.user.id,
      conversationId,
      dto,
    );
    this.chatGateway.emitMessageCreated(conversationId, message);
    this.chatGateway.emitConversationUpdated(conversationId);
    return message;
  }

  @Post('conversations/:conversationId/messages/offer')
  async sendCustomOrderOffer(
    @Request() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendCustomOrderOfferDto,
  ) {
    const message = await this.chatService.sendCustomOrderOffer(
      req.user.id,
      conversationId,
      dto,
    );
    this.chatGateway.emitMessageCreated(conversationId, message);
    this.chatGateway.emitConversationUpdated(conversationId);
    return message;
  }

  @Post('conversations/:conversationId/messages/image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_IMAGE_TYPES.test(file.mimetype)) {
          return callback(new Error('Only image files are allowed'), false);
        }
        callback(null, true);
      },
    }),
  )
  async sendImageMessage(
    @Request() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('caption') caption?: string,
  ) {
    const message = await this.chatService.sendImageMessage(
      req.user.id,
      conversationId,
      file,
      caption,
    );
    this.chatGateway.emitMessageCreated(conversationId, message);
    this.chatGateway.emitConversationUpdated(conversationId);
    return message;
  }

  @Post('conversations/:conversationId/read')
  async markAsRead(
    @Request() req: AuthenticatedRequest,
    @Param('conversationId') conversationId: string,
  ) {
    await this.chatService.markConversationRead(req.user.id, conversationId);
    this.chatGateway.emitConversationUpdated(conversationId);
    return { success: true };
  }

  @Get('unread-count')
  getUnreadCount(@Request() req: AuthenticatedRequest) {
    return this.chatService.getUnreadCount(req.user.id);
  }
}
