import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AIModule } from "../services/ai/ai.module";
import { CompaniesModule } from "../companies/companies.module";

@Module({
  imports: [PrismaModule, AIModule, CompaniesModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
