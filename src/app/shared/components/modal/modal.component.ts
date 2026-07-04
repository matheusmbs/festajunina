import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
})
export class ModalComponent {
  @Input() visivel = false;
  @Input() titulo = '';
  @Output() fechar = new EventEmitter<void>();

  protected onOverlayClick(): void {
    this.fechar.emit();
  }

  protected onConteudoClick(evento: MouseEvent): void {
    evento.stopPropagation();
  }
}
