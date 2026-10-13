import { Link } from "@tanstack/react-router";
import { SectionTitle } from "@/features/account/section-states";

export function SupportPage() {
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle description="Fale com a equipe da Kurio ou consulte a central de ajuda.">
        Suporte
      </SectionTitle>
      <dl className="flex flex-col gap-4 text-sm leading-6">
        <div>
          <dt className="font-bold">E-mail</dt>
          <dd>
            <a href="mailto:contato@email.com" className="text-highlight hover:underline">
              contato@email.com
            </a>
          </dd>
        </div>
        <div>
          <dt className="font-bold">Telefone</dt>
          <dd>
            <a href="tel:+551140028922" className="text-highlight hover:underline">
              +55 11 4002 8922
            </a>
          </dd>
        </div>
        <div>
          <dt className="font-bold">Dúvidas frequentes</dt>
          <dd>
            <Link to="/ajuda" className="text-highlight hover:underline">
              Abrir a central de ajuda
            </Link>
          </dd>
        </div>
      </dl>
    </div>
  );
}
