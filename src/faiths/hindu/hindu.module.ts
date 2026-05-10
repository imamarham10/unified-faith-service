import { Module } from '@nestjs/common';
import { PujaTimesModule } from './puja-times/puja-times.module';
import { ScripturesModule } from './scriptures/scriptures.module';
import { JapaModule } from './japa/japa.module';
import { PanchangModule } from './panchang/panchang.module';
import { StotrasModule } from './stotras/stotras.module';
import { DeityNamesModule } from './deity-names/deity-names.module';
import { TempleLocatorModule } from './temple-locator/temple-locator.module';
import { HinduFeelingsModule } from './feelings/feelings.module';
import { SacredStoriesModule } from './sacred-stories/sacred-stories.module';

@Module({
  imports: [
    PujaTimesModule,
    ScripturesModule,
    JapaModule,
    PanchangModule,
    StotrasModule,
    DeityNamesModule,
    TempleLocatorModule,
    HinduFeelingsModule,
    SacredStoriesModule,
  ],
  exports: [
    PujaTimesModule,
    ScripturesModule,
    JapaModule,
    PanchangModule,
    StotrasModule,
    DeityNamesModule,
    TempleLocatorModule,
    HinduFeelingsModule,
    SacredStoriesModule,
  ],
})
export class HinduModule {}
