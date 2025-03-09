import { useState } from "react";
import CompressForm from "./CompressForm";
import OrganizeForm from "./OrganizeForm/OrganizeForm"

export default function MainSection() {
  const [ isOrganize, setIsOrganize ] = useState(false)

  return (

    <main className="d-flex flex-column justify-content-center align-items-center flex-grow-1 mx-2">
      <button onClick={() => setIsOrganize((prevState) => !prevState)}>Organize</button>
      {isOrganize ? <OrganizeForm fileUrl={'http://research.nhm.org/pdfs/10840/10840.pdf'}/> : <CompressForm />}
    </main>
  );
}
