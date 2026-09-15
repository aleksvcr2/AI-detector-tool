/* Portuguese language pack. */

const RANKED = `de a o que e do da em um para é com não uma os no se na por mais as dos como mas foi ao ele das tem à seu sua ou ser quando muito há nos já está eu também só pelo pela até isso ela entre era depois sem mesmo aos ter seus quem nas me esse eles estão você tinha foram essa num nem suas meu às minha têm numa pelos elas havia seja qual será nós tenho lhe deles essas esses pelas este fosse dele tu te vocês vos lhes meus minhas teu tua teus tuas nosso nossa nossos nossas dela delas esta estes estas aquele aquela aqueles aquelas isto aquilo
ser estar ter fazer poder dizer ir ver dar saber querer chegar passar dever pôr parecer ficar crer falar levar deixar seguir encontrar chamar vir pensar sair voltar tomar conhecer viver sentir tratar olhar contar começar esperar procurar existir entrar trabalhar escrever perder produzir ocorrer entender pedir receber lembrar terminar permitir aparecer conseguir servir tirar precisar manter resultar ler cair mudar apresentar criar abrir considerar ouvir acabar converter ganhar formar trazer partir morrer aceitar realizar supor compreender explicar perguntar tocar reconhecer estudar alcançar nascer dirigir correr utilizar pagar ajudar gostar jogar escutar cumprir oferecer descobrir levantar tentar usar decidir repetir esquecer valer comprar subir descer notar mostrar indicar aumentar reduzir melhorar assegurar determinar identificar descrever discutir aplicar comparar analisar revisar aprovar rejeitar provar alegar acordar negar conceder ordenar assinar enviar obter referir atribuir registrar devolver eliminar substituir revelar compartilhar armazenar rastrear treinar visitar
ano dia tempo vez casa homem mulher parte vida momento forma caso mundo trabalho país lugar mão maneira noite coisa ponto tipo hora água nome povo mês semana grupo problema estado cidade exemplo pessoa gente criança família governo programa sistema empresa serviço preço valor nível número processo resultado razão causa efeito mudança fato questão pergunta resposta ideia palavra livro corpo cabeça olho cara pai mãe filho filha amigo equipe membro jogador jogo escola estudante professor rua carro estrada ar luz força energia natureza saúde mente coração dinheiro mercado produto direito lei
autor réu advogado testemunha testemunho depoimento moção petição estatuto regulamento contrato cláusula responsabilidade danos acordo requerente sentença apelação veredicto júri audiência prova anexo intimação negligência lesão seguradora apólice prêmio cobertura sinistro tratamento diagnóstico terapia recuperação acidente colisão veículo motorista passageiro culpa honorários cliente assunto escritório
grande pequeno bom mau novo velho jovem longo curto alto baixo maior menor melhor pior primeiro último único mesmo próprio geral específico comum especial similar diferente vários várias só inteiro completo cheio vazio claro escuro forte fraco duro macio fácil difícil simples complexo importante necessário possível impossível disponível razoável significativo relevante apropriado eficaz eficiente bem-sucedido útil valioso sério grave crítico central principal secundário final inicial original atual recente anterior futuro passado presente próximo certo provável verdadeiro falso real potencial local nacional público privado social político econômico financeiro legal médico técnico
modelo análise método abordagem estrutura função característica elemento fator variável medida métrica amostra população média mediana variância desvio distribuição padrão tendência sinal ruído limiar estimativa probabilidade confiança intervalo correlação regressão classificação exatidão precisão erro viés referência controle experimento hipótese conclusão resumo seção figura tabela apêndice citação
panorama âmbito aprofundar navegar leque plétora paradigma holístico robusto integral aproveitar utilizar facilitar otimizar melhorar fomentar cultivar empreender desbloquear liberar intrincado nuançado multifacetado inestimável crucial vital primordial profundo notável convincente cativante fascinante intrigante testemunho pedra angular fundamental essencial`;

const V = "aeiouáéíóúâêîôûãõàèìòù";
function syllables(w) {
  const s = w.toLowerCase().replace(/[^a-zàáâãéêíóôõúüç]/g, "");
  if (!s) return 0;
  let count = 0, prev = false;
  for (const ch of s) {
    const v = V.includes(ch);
    if (v && !prev) count++;
    prev = v;
  }
  return Math.max(1, count);
}

export default {
  code: "pt",
  name: "Portuguese",
  endonym: "Português",
  calibration: "secondary",
  ranked: RANKED,
  syllables,
  readability: (words, sents, syll) => 206.84 - 60 * (syll / words) - 1.02 * (words / sents),
  readabilityName: "Fernández Huerta (adapted)",
  // Portuguese contractions (do, na, pelo) are mandatory, like Spanish.
  contractionRe: null,
  functionWords: `de a o que e do da em um para é com não uma os no se na por mais as dos como mas foi ao ele das tem à seu sua ou ser quando muito há nos já está eu também só pelo pela até isso ela entre era depois sem mesmo aos ter seus quem nas me esse eles estão você tinha foram essa num nem suas meu às minha têm numa pelos elas havia seja qual nós lhe deles este dele tu te vocês vos lhes esta estes estas aquele aquela isto aquilo se sob sobre após durante contra segundo embora enquanto pois cada cujo cuja`,
  discourseMarkers: `no entanto | além disso | portanto | assim | consequentemente | por conseguinte | contudo | todavia | em primeiro lugar | em segundo lugar | finalmente | por último | por outro lado | por exemplo | ou seja | de fato | em conclusão | em resumo | em suma | enquanto | desse modo | vale mencionar | vale ressaltar | por outra parte | dito isso | com efeito`,
  registerMarkers: `no mundo atual | na era digital | é importante notar | é importante destacar | é importante ressaltar | vale a pena destacar | vale a pena notar | vale ressaltar | desempenha um papel fundamental | desempenha um papel crucial | um leque de | uma ampla gama de | uma miríade de | uma plétora de | aprofundar | o panorama | no âmbito de | em última análise | é fundamental | é crucial | abordagem holística | estrutura robusta | aproveitar o poder | desbloquear o potencial | pedra angular | um testemunho de | em constante evolução | sublinha a importância | lança luz sobre | em sua essência | quando se trata de | em conclusão | para concluir | em resumo | pontos principais | passo a passo | prós e contras | como modelo de linguagem | espero que isso ajude | neste artigo | não apenas | mas também`,
  hedges: `pode | poderia | podem | poderiam | talvez | possivelmente | provavelmente | geralmente | em geral | frequentemente | costuma | costumam | tende a | tendem a | aparentemente | ao que parece | em certa medida | relativamente | em alguns casos | amplamente | às vezes`,
  intensifiers: `muito | realmente | extremamente | incrivelmente | absolutamente | totalmente | sumamente | bastante | demasiado | tão | super | enormemente | profundamente`,
  firstPerson: `eu me mim comigo meu minha meus minhas nós nos nosso nossa nossos nossas`,
  abbreviations: `sr sra srta dr dra prof profa eng arq exmo ilmo etc ex p.ex pág págs núm art arts cap caps fig figs vol vols ed eds apto av avn cia s.a ltda inc a.m p.m jan fev mar abr mai jun jul ago set out nov dez seg ter qua qui sex sáb dom a b c d e f g h i j k l m n o p q r s t u v w x y z`,
  bands: {
    sentMean: { center: 23, spread: 7.5 },
    sentSd: { center: 10.5, spread: 4.0 },
    bandRate: { center: 0.31, spread: 0.11 },
    shortRate: { center: 0.13, spread: 0.08 },
    longRate: { center: 0.12, spread: 0.09 },
    funcRate: { center: 0.46, spread: 0.05 },
    firstPerson: { center: 10, spread: 8 },
    passive: { center: 0.12, spread: 0.07 },
    oovRate: { center: 0.32, spread: 0.10 },
    surpMean: { center: 10.9, spread: 1.2 },
    flesch: { center: 60, spread: 16 },
  },
  holds: { contraction: "Portuguese contractions are grammatically mandatory" },
};
