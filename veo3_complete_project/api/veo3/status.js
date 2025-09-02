import { Veo3Service } from "@/lib/veo3Service.js";
export default async function handler(req,res){
  try{
    const { task_id } = req.method==="GET" ? req.query : req.body;
    if(!task_id) return res.status(400).json({ ok:false, error:"task_id wajib" });
    const service = new Veo3Service();
    const data = await service.status({ task_id });
    res.status(200).json({ ok:true, ...data });
  }catch(error){
    res.status(error.response?.status||500).json({ ok:false, error:error.message, details:error.response?.data||null });
  }
}
