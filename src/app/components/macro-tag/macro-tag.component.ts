import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type MacroTagType = 'proteina' | 'carbohidrato' | 'grasa' | 'mixto';

@Component({
  selector: 'app-macro-tag',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './macro-tag.component.html',
  styleUrls: ['./macro-tag.component.scss']
})
export class MacroTagComponent {
  @Input() macro: MacroTagType = 'mixto';
  @Input() grams?: number | null;
  @Input() compact = false;

  get label(): string {
    switch (this.macro) {
      case 'proteina':
        return 'Proteína';
      case 'carbohidrato':
        return 'Carbohidrato';
      case 'grasa':
        return 'Grasa';
      default:
        return 'Mixto';
    }
  }

  get iconClass(): string {
    switch (this.macro) {
      case 'proteina':
        return 'fa-dumbbell';
      case 'carbohidrato':
        return 'fa-apple-alt';
      case 'grasa':
        return 'fa-tint';
      default:
        return 'fa-tag';
    }
  }

  get toneClass(): string {
    switch (this.macro) {
      case 'proteina':
        return 'macro-tag-proteina';
      case 'carbohidrato':
        return 'macro-tag-carbohidrato';
      case 'grasa':
        return 'macro-tag-grasa';
      default:
        return 'macro-tag-mixto';
    }
  }

  get showValue(): boolean {
    return typeof this.grams === 'number';
  }
}
